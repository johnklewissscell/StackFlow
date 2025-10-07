#!/usr/bin/env python3
import sys
import json
import traceback

def safe_print_json(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()

try:
    # Try to import the user's Chatbot implementation
    from chatbot import Chatbot
    chatbot_available = True
except Exception as e:
    chatbot_available = False
    _import_err = traceback.format_exc()

def fallback_response(prompt: str) -> str:
    # A tiny deterministic fallback so the web UI still works without heavy deps
    if not prompt or not prompt.strip():
        return "Please say something."
    p = prompt.strip().lower()
    if 'hello' in p or 'hi' in p:
        return "Hi! I'm StackAI (fallback). Ask me about stocks or trading."
    # Finance-related guidance (non-actionable)
    if any(tok in p for tok in ('invest', 'investment', 'when should i', 'should i buy', 'buy')) and 'aapl' in p:
        # Provide a safety-first, non-actionable template answer
        return (
            "I can't provide personalized investment advice, but here are general factors to consider when evaluating AAPL:\n"
            "• Your time horizon (short vs long term) and risk tolerance.\n"
            "• Company fundamentals: revenue growth, margins, product pipeline.\n"
            "• Valuation: compare price-to-earnings with peers and historical levels.\n"
            "• Market conditions and diversification: avoid putting too much of your portfolio into one stock.\n"
            "If you want a quick data-driven check, use the 'Get Price' button on the site to fetch recent prices and charts, and consult a licensed financial advisor for tailored advice."
        )
    if 'price' in p or 'stock' in p:
        return "I can fetch stock prices from the site. Use the Get Price button to view the latest chart and price for a symbol like AAPL." 
    return "Sorry, the AI model isn't available. This is a lightweight fallback reply."

def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw else {}
        prompt = data.get('prompt', '')

        if chatbot_available:
            try:
                bot = Chatbot()
                reply = bot.get_response(prompt)
                safe_print_json({'reply': reply})
                return
            except Exception:
                # If the heavy Chatbot fails at runtime, include the traceback in fallback
                tb = traceback.format_exc()
                safe_print_json({'reply': fallback_response(prompt), 'warning': tb})
                return
        else:
            # Chatbot import failed; return fallback with import error for debugging
            safe_print_json({'reply': fallback_response(prompt), 'import_error': _import_err})

    except Exception as e:
        safe_print_json({'error': 'runner_error', 'detail': traceback.format_exc()})

if __name__ == '__main__':
    main()
