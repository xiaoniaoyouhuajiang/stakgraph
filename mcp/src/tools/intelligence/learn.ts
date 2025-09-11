export const LEARN_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learn - Ask Questions</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #1a1a1a;
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            flex: 1;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 2rem;
            color: #ffffff;
            font-size: 2.5rem;
            font-weight: 300;
        }
        
        .input-container {
            margin-bottom: 2rem;
            text-align: center;
        }
        
        .question-input {
            width: 100%;
            padding: 1rem;
            font-size: 1.1rem;
            background-color: #2d2d2d;
            border: 2px solid #404040;
            border-radius: 8px;
            color: #e0e0e0;
            resize: vertical;
            min-height: 120px;
            font-family: inherit;
        }
        
        .question-input:focus {
            outline: none;
            border-color: #4a9eff;
            box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1);
        }
        
        .question-input::placeholder {
            color: #888;
        }
        
        .submit-btn {
            background-color: #4a9eff;
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            font-size: 1.1rem;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.2s;
            margin-top: 1rem;
        }
        
        .submit-btn:hover {
            background-color: #3a8eef;
        }
        
        .submit-btn:disabled {
            background-color: #555;
            cursor: not-allowed;
        }
        
        .answer-container {
            margin-top: 2rem;
            padding: 1.5rem;
            background-color: #2d2d2d;
            border-radius: 8px;
            border-left: 4px solid #4a9eff;
        }
        
        .answer-text {
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .loading {
            text-align: center;
            color: #888;
            font-style: italic;
        }
        
        .error {
            color: #ff6b6b;
            background-color: #3d1a1a;
            border-left-color: #ff6b6b;
        }
        
        .question-display {
            margin-bottom: 1rem;
            padding: 1rem;
            background-color: #333;
            border-radius: 6px;
            font-weight: 500;
        }
        
        .sub-questions-container {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid #404040;
        }
        
        .sub-questions-title {
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
            font-weight: 500;
        }
        
        .sub-questions-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .sub-question-pill {
            background-color: #404040;
            color: #e0e0e0;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #555;
        }
        
        .sub-question-pill:hover {
            background-color: #4a9eff;
            border-color: #4a9eff;
            transform: translateY(-1px);
        }
    </style>
</head>
<body>
    <div class="container">
            
        <div class="input-container">
            <textarea 
                id="questionInput" 
                class="question-input" 
                placeholder="Ask a question about the codebase..."
                rows="4"
            ></textarea>
            <button id="submitBtn" class="submit-btn">Ask Question</button>
        </div>
        
        <div id="answerContainer" style="display: none;">
            <div id="questionDisplay" class="question-display"></div>
            <div id="answerText" class="answer-text"></div>
            <div id="subAnswersContainer" class="sub-questions-container" style="display: none;">
                <div class="sub-questions-title">Related Questions:</div>
                <div id="subAnswersList" class="sub-questions-list"></div>
            </div>
        </div>
    </div>

    <script>
        const questionInput = document.getElementById('questionInput');
        const submitBtn = document.getElementById('submitBtn');
        const answerContainer = document.getElementById('answerContainer');
        const questionDisplay = document.getElementById('questionDisplay');
        const answerText = document.getElementById('answerText');
        const subAnswersContainer = document.getElementById('subAnswersContainer');
        const subAnswersList = document.getElementById('subAnswersList');
        
        async function askQuestion() {
            const question = questionInput.value.trim();
            if (!question) return;
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Asking...';
            answerContainer.style.display = 'block';
            questionDisplay.textContent = question;
            answerText.innerHTML = '<div class="loading">Thinking...</div>';
            
            try {
                const response = await fetch(\`/ask?question=\${encodeURIComponent(question)}\`);
                const data = await response.json();
                
                if (response.ok) {
                    answerText.innerHTML = data.answer || 'No answer received';
                    answerText.className = 'answer-text';
                    
                    // Display sub-questions if they exist
                    if (data.sub_answers && data.sub_answers.length > 0) {
                        subAnswersList.innerHTML = '';
                        data.sub_answers.forEach(subAnswer => {
                            const pill = document.createElement('div');
                            pill.className = 'sub-question-pill';
                            pill.textContent = subAnswer.question;
                            pill.addEventListener('click', () => {
                                questionInput.value = subAnswer.question;
                                // askQuestion();
                            });
                            subAnswersList.appendChild(pill);
                        });
                        subAnswersContainer.style.display = 'block';
                    } else {
                        subAnswersContainer.style.display = 'none';
                    }
                } else {
                    answerText.innerHTML = \`Error: \${data.error || 'Unknown error'}\`;
                    answerText.className = 'answer-text error';
                    subAnswersContainer.style.display = 'none';
                }
            } catch (error) {
                answerText.innerHTML = \`Error: \${error.message}\`;
                answerText.className = 'answer-text error';
                subAnswersContainer.style.display = 'none';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Ask Question';
            }
        }
        
        submitBtn.addEventListener('click', askQuestion);
        
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // Allow Shift+Enter to create new line (default behavior)
                    return;
                } else {
                    // Enter alone submits the question
                    e.preventDefault();
                    askQuestion();
                }
            }
        });
        
        // Focus the input on page load
        questionInput.focus();
    </script>
</body>
</html>`;
