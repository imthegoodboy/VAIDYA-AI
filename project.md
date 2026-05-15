BMS INSTITUTE OF TECHNOLOGY & MANAGEMENT 
Yelahanka, Bengaluru 560 064 
DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND MACHINE 
LEARNING 
AI FUSION CHALLENGE- HACKATHON 
Problem Statement -2 
Problem Statement : An Intelligent Q&A Assistant 
Title: “AI Vaidya: Building an Intelligent Q&A Assistant for Ayurveda 
Knowledge” 
Problem Overview: 
Ayurveda encompasses a vast body of traditional medical wisdom, spanning 
books, scriptures, and research documents. 
However, this knowledge is often unstructured, difficult to access, and not 
searchable in modern ways. 
Your challenge is to design an AI-powered system that can: 
● Ingest text data (e.g., Ayurveda books, research papers, articles) 
● Understand the content, and 
● Answer user queries in natural language (English) based on that 
knowledge — without using the internet for answers. 
Essentially, create a domain-specific retrieval-based Q&A system that acts as a 
digital Ayurvedic assistant — “AI Vaidya.” 
Objective: 
Develop a prototype where: 
1. 
The system can read and process Ayurvedic text (books or datasets 
BMS INSTITUTE OF TECHNOLOGY & MANAGEMENT 
Yelahanka, Bengaluru 560 064 
DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND MACHINE 
LEARNING 
provided). 
2. Users can ask health or concept-based questions, e.g. 
○ “What are the doshas in Ayurveda?” 
○ “How does turmeric help in wound healing?” 
3. The system returns context-aware answers only from the uploaded text 
or dataset. 
Expected Features: 
● user interface (web) to ask questions. 
● Backend that stores and retrieves relevant text chunks. 
● Integration with free APIs for embeddings or NLP. 
● Use of vector search or semantic retrieval to find relevant answers. 
Technical Hints: 
Data Input 
Use an open-access Ayurveda text from: 
● National Institute of Ayurveda open sources 
● AYUSH research papers 
● Or plain text/PDFs ( can be downloaded from the internet) 
Functional Flow: 
1. 
Upload or load an Ayurveda book (text or PDF- min 400 pages) 
2. System preprocesses and embeds text 
3. User types a question → system retrieves top relevant chunks 
4. The model generates the answer from those retrieved sections 
5. Display answer + reference text snippet 
BMS INSTITUTE OF TECHNOLOGY & MANAGEMENT 
Yelahanka, Bengaluru 560 064 
DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND MACHINE 
LEARNING 
Example Questions: 
● “What are the three Gunas in Ayurveda?” 
● “How is digestion described in Ayurveda?” 
● “Which herbs are useful for cough and cold according to classical texts?” 
Hackathon Submission Guidelines 
AI Vaidya – Ayurveda Intelligence Challenge 
What to Submit 
1. Working Application 
● Submit a functional prototype that fulfils the hackathon problem 
statement requirements — i.e., an AI system capable of understanding 
Ayurvedic text and answering user queries. 
● The application may be built as a web app, a desktop app, or a mobile 
prototype. 
● It must demonstrate the following: 
○ Ingestion of Ayurveda text/books/datasets. 
○ Intelligent question answering based on uploaded data. 
○ Integration of free/open APIs or open-source NLP models. 
2. Text Description / Documentation 
Each team must include a written description (maximum 2–3 pages or in the 
README) that clearly explains: 
BMS INSTITUTE OF TECHNOLOGY & MANAGEMENT 
Yelahanka, Bengaluru 560 064 
DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND MACHINE 
LEARNING 
● Project Title and Problem Statement 
Describe the problem your solution addresses within the Ayurveda 
domain. 
● Solution Overview 
Summarise your application, its features, and how it solves the problem. 
● Technical Architecture 
Outline how your system works — including data processing, model usage, 
and user flow. 
● APIs / Libraries Used 
Mention all free APIs and open-source models used. 
● Future Scope 
Optional: suggest how the system can be scaled or enhanced. 
3. Demonstration Video 
Each team must provide a short demo video (maximum 3 minutes) that includes: 
● A walkthrough of the working application. 
● Footage showing key functionality (uploading text, asking questions, 
getting responses). 
● Clear narration or captions explaining what’s being shown. 
● Video must be publicly viewable on YouTube or Vimeo. 
Note: 
● The video must not contain any copyrighted or infringing material. 
● Include the public video link in your submission form. 
BMS INSTITUTE OF TECHNOLOGY & MANAGEMENT 
Yelahanka, Bengaluru 560 064 
DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND MACHINE 
LEARNING 
4. GitHub Repository 
Submit a public GitHub repository containing your project source code. The 
repository must include: 
● Complete source code of the working application. 
● A README.md file with: 
○ Project overview and setup instructions. 
○ API/model usage documentation. 
○ Steps to Run or Test the Application. 
○ Any login credentials (if a private demo site is used). 
● An open-source license (MIT, Apache 2.0, etc.). 
5. Access for Testing 
● Judges must be able to access and test your application. 
● You can provide: 
○ A public live demo URL, or 
○ A hosted app link (Streamlit, Hugging Face Spaces, Render, etc.). 
● If login access is required, include test credentials in the README. 
● The application must remain publicly accessible until results are 
announced. 
6. Language & Format 
● All submissions (documentation, video, and app interface) must be in 
English. 
● Code comments and variable names should be clear and readable. 
BMS INSTITUTE OF TECHNOLOGY & MANAGEMENT 
Yelahanka, Bengaluru 560 064 
DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND MACHINE 
LEARNING 
Submission Summary Checklist 
Item 
Description 
Working Application 
Functional prototype fulfilling hackathon requirements 
Text Description 
Demo Video 
Project write-up + APIs used + functionality explained 
< 3 mins, uploaded on YouTube/Vimeo (public link) 
GitHub Repo 
Public repo with open-source license & setup guide 
Access Link 
Website/demo link or deployment credentials 
Evaluation Criteria 
Category 
Description 
Innovation 
Novelty of the approach / creativity 
Weight 
Technical Implementation Use of NLP, embeddings, and retrieval 
25% 
25% 
Accuracy 
Answers based on source text (not 
25% 
hallucinated) 
UI/UX & Presentation 
User-friendly design and explanation 
Expected Deliverable 
A working prototype (web or desktop app) that demonstrates: 
● Data ingestion (PDF or text) 
● Retrieval + answer generation 
● Interactive Q&A interface 
25% 