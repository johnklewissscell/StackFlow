# main.py
from chatbot import Chatbot

def main():
    print("🤖 My AI is ready! Type 'quit' to exit.\n")

    bot = Chatbot()  # Create chatbot instance

    while True:
        user_input = input("You: ")
        if user_input.lower() in ["quit", "exit"]:
            print("Goodbye! 👋")
            break

        response = bot.get_response(user_input)
        print("AI:", response)

if __name__ == "__main__":
    main()
