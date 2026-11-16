// api.js - Connects the VYBE frontend to your HostingRaja backend
const BACKEND_URL = "https://yourdomain.com/backend/analyze_food.php"; 

async function sendImageToMrVyb(imageUri) {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageUri })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error communicating with Mr. Vyb's backend:", error);
        return { error: "Failed to reach Mr. Vyb. Check your network connection!" };
    }
}