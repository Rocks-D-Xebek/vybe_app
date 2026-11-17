document.addEventListener('DOMContentLoaded', () => {
    // Bottom Navigation Logic
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
                // For development: Create placeholder view if it doesn't exist yet
                const newView = document.createElement('div');
                newView.id = targetId;
                newView.className = 'view active';
                newView.innerHTML = `<h2>${targetId.replace('view-', '').toUpperCase()} Dashboard coming soon...</h2>`;
                document.getElementById('app-content').appendChild(newView);
            }
        });
    });

    // Scanner Button Logic
    document.getElementById('scanFoodBtn').addEventListener('click', openCamera);
    document.getElementById('navScanBtn').addEventListener('click', openCamera);

    function openCamera() {
        console.log("Capacitor Camera API will trigger here");
        // We will wire this to the native device camera in the next step
    }
});