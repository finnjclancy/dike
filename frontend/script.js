const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const fileUpload = document.getElementById('fileUpload');
const uploadBtn = document.querySelector('.upload-btn');

// Store the last bot question
let lastBotQuestion = "";

// Function to create a typing effect for the bot
function typeMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    messagesDiv.prepend(msgDiv); // Add message at the top (chat scrolls up)

    let i = 0;
    function type() {
        if (i < text.length) {
            msgDiv.textContent += text.charAt(i);
            i++;
            setTimeout(type, 20); // Speed of typing effect
        }
    }
    type();

    // Store only actual questions from the bot (not confirmations)
    if (sender === "bot" && !text.includes("uploaded successfully")) {
        lastBotQuestion = text;
    }
}

// Show bot's first message
typeMessage("Hello! I'll be assisting you with your life insurance today. Let's get started! How old are you?", "bot");

// Flag to stop the chat when a decision is made
let chatEnded = false;

// Send message when pressing "Enter"
userInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { // Prevents line breaks with Shift+Enter
        event.preventDefault(); // Stops Enter from adding a new line
        sendBtn.click(); // Simulate clicking the send button
    }
});

// Send message on button click
sendBtn.addEventListener('click', async () => {
    const userText = userInput.value.trim();
    if (!userText) return;

    // Display user message instantly
    typeMessage(userText, 'user');
    userInput.value = "";

    try {
        const response = await fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText })
        });

        const data = await response.json();
        
        // Typing effect for bot's response
        typeMessage(data.response, 'bot');

    } catch (error) {
        typeMessage("❌ Error connecting to server.", "bot");
    }
});


// Upload button should trigger file selection
uploadBtn.addEventListener('click', () => {
    fileUpload.click(); // Opens file selection dialog
});

// Function to sanitize file names (removes non-ASCII characters)
function sanitizeFileName(filename) {
    return filename.replace(/[^\x20-\x7E]/g, ""); // Removes any non-ASCII characters
}

// File selection and upload handling
fileUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];

    if (file) {
        const cleanFileName = sanitizeFileName(file.name); // Sanitize file name

        typeMessage(`📁 Uploaded: ${cleanFileName}`, 'user'); // Ensure clean file name

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://127.0.0.1:5000/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            typeMessage(`✅ File '${cleanFileName}' uploaded successfully!`, 'bot'); // Confirm successful upload

            // **Call the LLM to rephrase the last question**
            if (lastBotQuestion) {
                const rephrasedQuestion = await getRephrasedQuestion(lastBotQuestion);
                setTimeout(() => {
                    typeMessage(rephrasedQuestion, "bot"); // Ask the rephrased question
                }, 1000);
            }
        } catch (error) {
            typeMessage("❌ Error uploading file.", "bot");
        }
    }
});

// Function to call the backend and ask the LLM to rephrase the question
async function getRephrasedQuestion(originalQuestion) {
    try {
        const response = await fetch('http://127.0.0.1:5000/rephrase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: originalQuestion })
        });

        const data = await response.json();
        return data.rephrased_question || originalQuestion; // Use rephrased or fallback to original
    } catch (error) {
        return originalQuestion; // If error, just use the original question
    }
}
