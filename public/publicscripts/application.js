let balance = 10000
const balanceEl = document.getElementById('balance')
if (balanceEl) balanceEl.innerText = balance.toFixed(2)
let chart
let currentSymbol = null
let preferCandlestick = false

console.log('application.js loaded')

document.getElementById('getStock').addEventListener('click', async () => {
  try {
    const symbol = document.getElementById('symbol').value.trim().toUpperCase()
    if (!symbol) return
    const stockInfo = document.getElementById('stock-info')
    stockInfo.innerHTML = 'Loading...'
    const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=1M`)
    if (!resp.ok) {
      stockInfo.innerHTML = `No data for ${symbol}`
      return
    }
    const json = await resp.json()
    if (!json || !json.candles || json.candles.length === 0) {
      stockInfo.innerHTML = `No data for ${symbol}`
      return
    }
    const price = json.candles[json.candles.length - 1].c
    if (price == null) {
      stockInfo.innerHTML = `No price data`
      return
    }
    currentSymbol = symbol
    const companyName = json.companyName && typeof json.companyName === 'string' && json.companyName.trim() ? json.companyName.trim() : symbol
    stockInfo.innerHTML = `
      <h2>${companyName} <small style="font-weight:normal; font-size:0.8em; color:#666">(${symbol})</small></h2>
      <p>Current Price: $<span id="current-price">${price.toFixed(2)}</span> <small id="last-updated" style="color:#666;font-size:0.85em">(updated just now)</small></p>
      <button id="buyBtn">Buy</button>
      <button id="sellBtn">Sell</button>
    `
    document.getElementById('buyBtn').addEventListener('click', () => trade('buy', price))
    document.getElementById('sellBtn').addEventListener('click', () => trade('sell', price))
    updateChart(symbol, '1M')
  } catch (err) {
    console.error('price fetch error', err)
    document.getElementById('stock-info').innerHTML = `<p style="color:red">${err.message}</p>`
  }
})

document.getElementById('toggleCandle').addEventListener('click', () => {
  preferCandlestick = true
  if (currentSymbol) updateChart(currentSymbol, '1M')
})

const chatMessages = document.getElementById('chat-messages')
const chatInput = document.getElementById('chat-input')
const chatSend = document.getElementById('chat-send')
const chatStatus = document.getElementById('chat-status')

function appendChat(who, text) {
  const div = document.createElement('div')
  div.style.marginBottom = '8px'
  div.innerHTML = `<strong>${who}:</strong> ${text}`
  chatMessages.appendChild(div)
  chatMessages.scrollTop = chatMessages.scrollHeight
}

chatSend.addEventListener('click', async () => {
  const text = chatInput.value.trim()
  if (!text) return
  appendChat('You', text)
  chatInput.value = ''
  chatStatus.innerText = 'Thinking...'
  try {
    const resp = await fetch('/api/stackai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text }) })
    if (!resp.ok) {
      appendChat('System', `Error ${resp.status}`)
      chatStatus.innerText = ''
      return
    }
    const j = await resp.json()
    appendChat('AI', j.reply || JSON.stringify(j))
  } catch (err) {
    appendChat('System', 'Chat failed — using fallback.')
    appendChat('AI', 'AI backend offline — try later.')
  } finally {
    chatStatus.innerText = ''
  }
})

document.querySelectorAll('#time-range button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentSymbol) {
      document.getElementById('stock-info').innerHTML = 'Loading chart...'
      updateChart(currentSymbol, btn.dataset.range)
    }
  })
})

function trade(type, price) {
  if (!currentSymbol) return alert('No symbol selected. Click Get Price first.')
  const portEl = promptChoosePortfolio()
  if (!portEl) return
  if (type === 'buy') {
    const portBal = parseCurrency(portEl.querySelector('.portfolio-balance').innerText)
    if (portBal < price) return alert('Selected portfolio does not have enough balance to buy 1 share')
    adjustPortfolioBalance(portEl, -price)
    const res = updatePortfolioRow(portEl, currentSymbol, price, +1)
    if (res.sharesAdded) {
      balance = Math.max(0, balance - price)
      if (balanceEl) balanceEl.innerText = balance.toFixed(2)
    }
  } else if (type === 'sell') {
    const res = updatePortfolioRow(portEl, currentSymbol, price, -1)
    if (res.sharesAdded) {
      adjustPortfolioBalance(portEl, +price)
      balance = balance + price
      if (balanceEl) balanceEl.innerText = balance.toFixed(2)
    }
  }
}

function listPortfolios() {
  const nodes = Array.from(document.querySelectorAll('.portfolio'))
  return nodes.map((el, idx) => ({ el, name: (el.querySelector('.portfolio-name')||{innerText:''}).innerText.trim() || `Portfolio ${idx+1}`, idx: idx+1 }))
}

function promptChoosePortfolio() {
  const list = listPortfolios()
  if (!list.length) { alert('No portfolios found. Create one first.'); return null }
  let msg = 'Choose a portfolio number:\n'
  list.forEach(p => { msg += `${p.idx}: ${p.name}\n` })
  const pick = prompt(msg)
  if (!pick) return null
  const num = parseInt(pick)
  if (isNaN(num) || num < 1 || num > list.length) { alert('Invalid portfolio selection'); return null }
  return list[num-1].el
}

function parseCurrency(text) { return parseFloat(String(text).replace(/[^0-9.-]+/g,'')) || 0 }

function updatePortfolioRow(portEl, symbol, price, deltaShares) {
  const tbody = portEl.querySelector('tbody')
  let row = Array.from(tbody.querySelectorAll('tr')).find(r => r.children[0].innerText === symbol)
  if (!row && deltaShares > 0) {
    const shares = 1
    const costBasis = price
    const totalCost = shares * costBasis
    const marketValue = shares * price
    const gain = marketValue - totalCost
    const percentGain = totalCost ? (gain / totalCost) * 100 : 0
    row = document.createElement('tr')
    row.innerHTML = `
      <td>${symbol}</td>
      <td>${shares}</td>
      <td>$${costBasis.toFixed(2)}</td>
      <td>$${totalCost.toFixed(2)}</td>
      <td>$${marketValue.toFixed(2)}</td>
      <td>${gain >=0?'+':''}$${gain.toFixed(2)}</td>
      <td>${percentGain.toFixed(2)}%</td>
      <td>—</td>
      <td><button class="remove-stock">✖</button></td>
    `
    row.querySelector('.remove-stock').addEventListener('click', ()=>{ row.remove() })
    tbody.appendChild(row)
    return { sharesAdded: 1 }
  }
  if (!row) return { sharesAdded: 0 }
  const sharesCell = row.children[1]
  const costBasisCell = row.children[2]
  const totalCostCell = row.children[3]
  const existingShares = parseFloat(sharesCell.innerText)||0
  const existingCostBasis = parseCurrency(costBasisCell.innerText)||0
  const existingTotalCost = existingShares*existingCostBasis
  const newShares = existingShares+deltaShares
  if (newShares<0) { alert('Not enough shares to sell'); return {sharesAdded:0} }
  let newTotalCost = existingTotalCost
  if (deltaShares>0) newTotalCost = existingTotalCost + price*deltaShares
  else if (deltaShares<0) newTotalCost = Math.max(0, existingTotalCost - existingCostBasis*Math.min(existingShares, Math.abs(deltaShares)))
  const newCostBasis = newShares>0? newTotalCost/newShares:0
  const marketValue = newShares*price
  const gain = marketValue - newTotalCost
  const percentGain = newTotalCost? (gain/newTotalCost)*100:0
  sharesCell.innerText = newShares
  costBasisCell.innerText = `$${newCostBasis.toFixed(2)}`
  totalCostCell.innerText = `$${newTotalCost.toFixed(2)}`
  row.children[4].innerText = `$${marketValue.toFixed(2)}`
  row.children[5].innerText = `${gain>=0?'+':''}$${gain.toFixed(2)}`
  row.children[6].innerText = `${percentGain.toFixed(2)}%`
  if (newShares===0) row.remove()
  return { sharesAdded: deltaShares }
}

function adjustPortfolioBalance(portEl, deltaAmount) {
  const balEl = portEl.querySelector('.portfolio-balance')
  let bal = parseCurrency(balEl.innerText)
  bal += deltaAmount
  balEl.innerText = bal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})
}

async function updateChart(symbol, range) {
  try {
    const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`)
    if (!resp.ok) { document.getElementById('stock-info').innerHTML += '<p>No chart data available.</p>'; return }
    const json = await resp.json()
    if (!json || !json.candles || json.candles.length===0) { document.getElementById('stock-info').innerHTML += '<p>No chart data available.</p>'; return }
    const financialData = json.candles.map(c=>({x:new Date(c.t),o:c.o,h:c.h,l:c.l,c:c.c}))
    const container = document.getElementById('chart-container')
    if(container) container.style.display='block'
    let canvas = document.getElementById('stockChart')
    if(!canvas){ container.innerHTML='<canvas id="stockChart"></canvas>'; canvas=document.getElementById('stockChart')}
    const ctx = canvas.getContext('2d')
    try { if(chart){chart.destroy(); chart=null} } catch(e){}
    if(!preferCandlestick){
      const labels = financialData.map(d=>d.x)
      const closePrices = financialData.map(d=>d.c)
      chart = new Chart(ctx,{type:'line',data:{labels,datasets:[{label:`${symbol} Close`,data:closePrices,borderColor:'blue',fill:false}]},options:{responsive:true,maintainAspectRatio:false}})
      return
    }
    chart = new Chart(ctx,{type:'candlestick',data:{datasets:[{label:`${symbol} Candles`,data:financialData}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{type:'time',time:{unit:'day'}},y:{title:{display:true,text:'Price ($)'}}}}})
    preferCandlestick=false
  } catch (e) { console.error('updateChart error',e); document.getElementById('stock-info').innerHTML+='<p>Error loading chart.</p>' }
}

const addPortfolioBtn = document.getElementById('add-portfolio')
const portfoliosDiv = document.getElementById('portfolios')
function createPortfolio(name="New Portfolio",balance=10000){
  const portfolio = document.createElement('div')
  portfolio.classList.add('portfolio')
  portfolio.style.marginTop="20px"
  portfolio.style.border="1px solid #ccc"
  portfolio.style.borderRadius="10px"
  portfolio.style.padding="16px"
  portfolio.style.background="#fafafa"
  portfolio.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h3 contenteditable="true" class="portfolio-name">${name}</h3>
      <button class="delete-portfolio" style="background:#ff4d4d;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">Delete</button>
    </div>
    <p>Balance: $<span class="portfolio-balance">${balance.toLocaleString(undefined,{minimumFractionDigits:2})}</span></p>
    <button class="add-stock">Add Stock</button>
    <table class="stock-table" style="width:100%;border-collapse:collapse;margin-top:10px;">
      <thead style="background:#0078ff;color:white;">
        <tr>
          <th>Ticker</th>
          <th>Shares</th>
          <th>Cost Basis</th>
          <th>Total Cost</th>
          <th>Market Value</th>
          <th>Gain / Loss</th>
          <th>% Gain</th>
          <th>Portfolio %</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `
  const addStockBtn=portfolio.querySelector('.add-stock')
  const deleteBtn=portfolio.querySelector('.delete-portfolio')
  const tbody=portfolio.querySelector('tbody')
  const balanceEl=portfolio.querySelector('.portfolio-balance')
  deleteBtn.addEventListener('click',()=>{if(confirm(`Delete portfolio "${name}"?`)){portfolio.remove()}})
  addStockBtn.addEventListener('click',async ()=>{
    const ticker=prompt("Enter stock ticker:")?.toUpperCase()
    if(!ticker)return
    const shares=parseFloat(prompt("Enter number of shares:"))
    if(isNaN(shares)||shares<=0)return alert("Invalid number of shares")
    let costBasis=null
    try{
      const r=await fetch(`/api/stock?symbol=${encodeURIComponent(ticker)}&range=1D`)
      if(r.ok){const j=await r.json(); if(j?.candles?.length){const last=j.candles[j.candles.length-1]; if(last&&typeof last.c==='number')costBasis=last.c}}
    }catch(e){}
    if(costBasis==null){ costBasis=parseFloat(prompt("Enter cost basis per share ($):")); if(isNaN(costBasis)||costBasis<=0)return alert("Invalid cost basis") }
    const totalCost=shares*costBasis
    const marketValue=shares*costBasis
    const gain=marketValue-totalCost
    const percentGain=totalCost?(gain/totalCost)*100:0
    const row=document.createElement('tr')
    row.innerHTML=`
      <td>${ticker}</td>
      <td>${shares}</td>
      <td>$${costBasis.toFixed(2)}</td>
      <td>$${totalCost.toFixed(2)}</td>
      <td>$${marketValue.toFixed(2)}</td>
      <td>${gain>=0?'+':''}$${gain.toFixed(2)}</td>
      <td>${percentGain.toFixed(2)}%</td>
      <td>—</td>
      <td><button class="remove-stock">✖</button></td>
    `
    row.querySelector('.remove-stock').addEventListener('click',()=>{
      row.remove()
    })
    tbody.appendChild(row)
    const newBalance=parseFloat(balanceEl.textContent.replace(/,/g,''))-totalCost
    balanceEl.textContent=newBalance.toLocaleString(undefined,{minimumFractionDigits:2})
  })
  portfoliosDiv.appendChild(portfolio)
}

addPortfolioBtn.addEventListener('click',()=>{
  const name=prompt("Enter your portfolio name:")
  if(name) createPortfolio(name)
})

async function getLatestPrice(symbol){
  try{
    const resp=await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=1D`)
    if(!resp.ok)return null
    const j=await resp.json()
    if(!j?.candles?.length)return null
    const last=j.candles[j.candles.length-1]
    return {price:last.c,t:last.t}
  }catch(e){return null}
}

function updatePortfolioRowMarket(row,latestPrice){
  try{
    const shares=parseFloat(row.children[1].innerText)||0
    const totalCost=parseCurrency(row.children[3].innerText)||0
    const marketValue=shares*latestPrice
    const gain=marketValue-totalCost
    const percentGain=totalCost?(gain/totalCost)*100:0
    row.children[4].innerText=`$${marketValue.toFixed(2)}`
    row.children[5].innerText=`${gain>=0?'+':''}$${gain.toFixed(2)}`
    row.children[6].innerText=`${percentGain.toFixed(2)}%`
  }catch(e){}
}

async function refreshAllPrices(){
  try{
    const symbols=new Set()
    if(currentSymbol)symbols.add(currentSymbol)
    document.querySelectorAll('.stock-table tbody tr').forEach(r=>{
      const t=(r.children[0]?.innerText||'').trim()
      if(t)symbols.add(t.toUpperCase())
    })
    if(!symbols.size)return
    const entries=Array.from(symbols)
    const promises=entries.map(s=>getLatestPrice(s).then(res=>({s,res})))
    const results=await Promise.all(promises)
    results.forEach(({s,res})=>{
      if(!res||typeof res.price!=='number')return
      const latestPrice=res.price
      if(currentSymbol&&s===currentSymbol){
        const cp=document.getElementById('current-price')
        if(cp)cp.innerText=latestPrice.toFixed(2)
        const lu=document.getElementById('last-updated')
        if(lu){try{const d=new Date(res.t);lu.innerText=`(updated ${d.toLocaleTimeString()})`}catch(e){}}
      }
      document.querySelectorAll('.stock-table tbody tr').forEach(row=>{
        if((row.children[0]?.innerText||'').toUpperCase()===s){
          updatePortfolioRowMarket(row,latestPrice)
        }
      })
    })
  }catch(e){console.error('refreshAllPrices',e)}
}
setInterval(refreshAllPrices,30000)
