// api/call-gemini.js

export default async function handler(request, response) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { model, prompt } = request.body;

    // Securely access the API key from server-side environment variables
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    // Crucial check: Ensure the API key is configured in your Vercel project
    if (!apiKey) {
        console.error("CRITICAL: GOOGLE_AI_API_KEY environment variable not found on the server.");
        return response.status(500).json({ error: 'The server is missing the required API key configuration.' });
    }

    // Construct the correct API URL for the model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Prepare the payload for the Google AI API
    const payload = {
        contents: [prompt],
        generationConfig: {
            // Specify JSON output for receipt scanning
            response_mime_type: model.includes('flash') && prompt.parts.some(p => p.inlineData) ? "application/json" : "text/plain",
        },
    };

    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // If the API call itself fails, provide detailed error feedback
        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            console.error('Google AI API Error Response:', JSON.stringify(errorBody, null, 2));
            const errorMessage = errorBody.error?.message || 'An unknown error occurred with the AI service.';
            return response.status(apiResponse.status).json({ error: `Google AI API Error: ${errorMessage}` });
        }

        const result = await apiResponse.json();
        
        // Safely extract the text from the response
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
             console.error('Unexpected API response structure:', JSON.stringify(result, null, 2));
             return response.status(500).json({ error: 'Could not extract text from the AI response.' });
        }
        
        // Send the successful response back to the frontend
        return response.status(200).json({ text });

    } catch (error) {
        console.error('Internal Server Error while calling Google AI:', error);
        return response.status(500).json({ error: 'An internal server error occurred.' });
    }
}
