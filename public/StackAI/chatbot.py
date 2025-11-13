from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

class Chatbot:
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
        self.model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")
        self.generator = pipeline("text-generation", model=self.model, tokenizer=self.tokenizer)
        self.conversation_history = []

    def get_response(self, text: str) -> str:
        if not text.strip():
            return "Please say something."

        self.conversation_history.append(f"Human: {text}")
        prompt = "\n".join(self.conversation_history) + "\nAI:"

        response = self.generator(
            prompt,
            max_new_tokens=50,
            truncation=True,
            do_sample=True,
            top_p=0.9,
            temperature=0.7
        )

        reply = response[0]['generated_text'][len(prompt):].strip()
        if "\n" in reply:
            reply = reply.split("\n")[0]
        self.conversation_history.append(f"AI: {reply}")
        return reply