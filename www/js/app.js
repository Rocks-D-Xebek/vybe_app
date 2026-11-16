document.addEventListener('DOMContentLoaded', () => {
    
    // --- Bottom Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all tabs and views
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding view
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetView = document.getElementById(targetId);
            
            if (targetView) {
                targetView.classList.add('active');
            } else {
                // Creates a placeholder view for missing tabs
                const newView = document.createElement('div');
                newView.id = targetId;
                newView.className = 'view active';
                newView.innerHTML = `<h2>${targetId.replace('view-', '').toUpperCase()} Dashboard coming soon...</h2>`;
                document.getElementById('app-content').appendChild(newView);
            }
        });
    });

    // --- Camera & Scanner Logic ---
    document.getElementById('scanFoodBtn').addEventListener('click', openCamera);
    document.getElementById('navScanBtn').addEventListener('click', openCamera);

    async function openCamera() {
        try {
            // Check if running on native device
            if (typeof Capacitor !== 'undefined' && Capacitor.Plugins.Camera) {
                const image = await Capacitor.Plugins.Camera.getPhoto({
                    quality: 80,
                    allowEditing: false,
                    resultType: 'uri', // Returns file URI for native device
                    source: 'CAMERA'
                });

                // Display the image in the UI
                document.getElementById('food-image-preview').src = image.webPath;
                
                // Hide scan button, show preview and analyze button
                document.getElementById('scanFoodBtn').style.display = 'none';
                document.getElementById('food-preview-container').style.display = 'block';
                
            } else {
                alert("Camera is only available when running on an Android/iOS device.");
            }
        } catch (error) {
            console.error("Camera closed or failed:", error);
        }
    }

    // --- Analyze Food Button Logic ---
    document.getElementById('analyzeFoodBtn').addEventListener('click', () => {
        const analyzeBtn = document.getElementById('analyzeFoodBtn');
        
        // Show loading state
        analyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mr. Vyb is thinking...';
        analyzeBtn.style.backgroundColor = 'var(--accent-purple)';
        analyzeBtn.style.color = '#fff';
        
        // Simulate API call delay
        setTimeout(() => {
            alert("Image ready to be sent to your PHP/Gemini backend!");
            // Reset button state
            analyzeBtn.innerHTML = '<i class="fa-solid fa-robot"></i> Ask Mr. Vyb';
            analyzeBtn.style.backgroundColor = 'var(--accent-cyan)';
            analyzeBtn.style.color = '#000';
        }, 2000);
    });
});