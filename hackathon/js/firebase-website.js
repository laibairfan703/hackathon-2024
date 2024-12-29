document.addEventListener("DOMContentLoaded", () => {
    // Initialize Firebase
    fetch('../js/firebase-config.json') // Adjust the path accordingly
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load Firebase config: ' + response.status);
            }
            return response.json();
        })
        .then(config => {
            // Initialize Firebase only if it hasn't been initialized yet
            if (!firebase.apps.length) {
                firebase.initializeApp(config);
                console.log("Firebase initialized");
            }

            const auth = firebase.auth();
            const db = firebase.firestore();

            // Authenticate the user on page load
            authenticateUser(auth);

            // Handle Authentication logic
            handleAuthLogic(auth, db);
            
            // Fetch and display recent posts
            fetchRecentPosts(db);

            // Create post functionality
            createPost(auth, db);
        })
        .catch(error => {
            console.error('Error initializing Firebase:', error);
        });
});

// Authentication UI updates
function updateUI(user) {
    const getStartedBtn = document.getElementById("getStartedBtn");  // "Get Started" button
    const profilePic = document.querySelector(".profilePic"); // Profile picture
    const createPostBtn = document.getElementById("createPostLink");  // Create Post button
    const logoutBtn = document.getElementById("logout"); // Logout button

    // Hide the "Get Started" button and show profile section
    getStartedBtn.style.display = "none";  // Hide the Get Started button
    createPostBtn.style.display = "block";  // Make the Create Post button visible

    // Set profile picture (if available, else use default)
    profilePic.src = "../images/profile.jpg";

    // Show logout button
    logoutBtn.style.display = "block"; // Show the logout button
}

// Authentication logic
function handleAuthLogic(auth, db) {
    // Signup Button Logic (Email/Password)
    const signUpButton = document.getElementById('signup');
    if (signUpButton) {
        signUpButton.addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Sign up user
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    const user = userCredential.user;
                    // Save user data in Firestore
                    return db.collection('users').doc(user.uid).set({
                        email: email,
                        posts: 0,  // Initial posts count
                        createdAt: firebase.firestore.Timestamp.now() // Creation timestamp
                    });
                })
                .then(() => {
                    alert('Account Registered!');
                    // After signup, log the user in automatically
                    auth.signInWithEmailAndPassword(email, password)
                        .then(userCredential => {
                            const user = userCredential.user;
                            // Retrieve user progress from Firestore
                            db.collection('users').doc(user.uid).get()
                                .then(doc => {
                                    if (doc.exists) {
                                        const userData = doc.data();
                                        localStorage.setItem('email', user.email);
                                        localStorage.setItem('posts', userData.posts); // Store posts count in local storage
                                        alert('Login Successful!');
                                        updateUI(user);
                                    } else {
                                        console.error('User does not exist in Firestore');
                                        alert('Login failed: User not found');
                                    }
                                });
                        });
                })
                .catch(error => {
                    console.error('Sign-up error:', error.message);
                    alert('Sign-up failed: ' + error.message);
                });
        });
    }

    // Login Button Logic (Email/Password)
    const logInButton = document.getElementById('login');
    if (logInButton) {
        logInButton.addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Log in user
            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    const user = userCredential.user;
                    // Retrieve user progress from Firestore
                    db.collection('users').doc(user.uid).get()
                        .then(doc => {
                            if (doc.exists) {
                                const userData = doc.data();
                                localStorage.setItem('email', user.email);
                                localStorage.setItem('posts', userData.posts); // Store posts count in local storage
                                alert('Login Successful!');
                                updateUI(user);
                            } else {
                                console.error('User does not exist in Firestore');
                                alert('Login failed: User not found');
                            }
                        });
                })
                .catch((error) => {
                    console.error('Login error:', error.message);
                    alert('Login failed: ' + error.message);
                });
        });
    }

    // Google Login
    const googleLoginBtn = document.getElementById('login-google');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(result => {
                    const user = result.user;
                    // Retrieve user progress from Firestore
                    db.collection('users').doc(user.uid).get()
                        .then(doc => {
                            if (doc.exists) {
                                const userData = doc.data();
                                localStorage.setItem('email', user.email);
                                localStorage.setItem('posts', userData.posts); // Store posts count in local storage
                                alert('Login Successful!');
                                updateUI(user);
                            } else {
                                // Save user data in Firestore if it doesn't exist
                                db.collection('users').doc(user.uid).set({
                                    email: user.email,
                                    posts: 0, // Initial posts count
                                    createdAt: firebase.firestore.Timestamp.now() // Creation timestamp
                                })
                                .then(() => {
                                    localStorage.setItem('email', user.email);
                                    localStorage.setItem('posts', 0);
                                    alert('Google Login Successful!');
                                    updateUI(user);
                                })
                                .catch(error => {
                                    console.error('Error saving user data:', error.message);
                                    alert('Error during Google login: ' + error.message);
                                });
                            }
                        });
                })
                .catch(error => {
                    console.error('Google login error:', error.message);
                    alert('Google login failed: ' + error.message);
                });
        });
    }

    // Sign-out functionality
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function() {
            auth.signOut().then(() => {
                console.log("User logged out");
                localStorage.clear(); // Clear local storage on logout
                window.location.reload(); // Reload to reset UI
            }).catch((error) => {
                console.error("Error logging out:", error);
            });
        });
    }
}

// -------- //

// Authenticate user across all pages
function authenticateUser(auth) {
    const storedEmail = localStorage.getItem('email'); // Check for email in localStorage
    if (!storedEmail) {
        redirectToLogin();
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            if (user.email !== storedEmail) {
                // Email mismatch, clear localStorage and redirect
                localStorage.clear();
                redirectToLogin();
            } else {
                console.log("User authenticated:", user.email);
                updateUI(user); // Call your existing function to update the UI
            }
        } else {
            // User not signed in, redirect to login
            localStorage.clear();
            redirectToLogin();
        }
    });
}

function redirectToLogin() {
    alert("You need to log in to access this page.");
}

// --- //

// Create post functionality
function createPost(auth, db) {
    const createPostBtn = document.getElementById("createPostBtn");
    if (!createPostBtn) {
        console.error('Create Post button not found!');
        return;
    }

    createPostBtn.addEventListener("click", () => {
        const user = auth.currentUser;  // Get the current logged-in user
        if (!user) {
            alert("You must be logged in to create a post.");
            return;
        }

        const title = document.getElementById("headingInput").value;
        const content = document.getElementById("contentInput").value;
        const category = document.getElementById("categoryInput").value;

        if (!title || !content) {
            alert("Please fill in all fields!");
            return;
        }

        // Calculate reading time (200 words per minute approx.)
        const words = content.split(" ").length;
        const readingTime = Math.ceil(words / 200);

        // Generate preview (first two lines)
        const preview = content.split("\n").slice(0, 2).join(" ");

        const postData = {
            title: title,
            content: content,
            category: category,
            author: user.email,
            readingTime: readingTime,
            uploadDate: firebase.firestore.Timestamp.now(),
            preview: preview,
        };

        // Save post to Firestore
        db.collection("posts").add(postData)
            .then(() => {
                alert("Post created successfully!");
                // Clear input fields after submission
                document.getElementById("headingInput").value = "";
                document.getElementById("contentInput").value = "";
                fetchRecentPosts(db); // Refresh recent posts after creating a post
            })
            .catch(error => {
                console.error("Error creating post:", error.message);
                alert("Failed to create post: " + error.message);
            });
    });
}

// Function to fetch recent posts from Firestore
function fetchRecentPosts(db) {
    const postsContainer = document.getElementById("recentPostsContainer");

    if (!postsContainer) {
        console.error("Recent posts container not found!");
        return;
    }

    // Clear existing posts
    postsContainer.innerHTML = "";

    db.collection('posts')
        .orderBy("uploadDate", "desc")  // Order by uploadDate
        .limit(5)  // Fetch only 5 most recent posts
        .get()
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const postData = doc.data();
                const postElement = document.createElement("div");
                postElement.classList.add("post");
                postElement.innerHTML = `
                <hr/>
                    <h3>${postData.title}</h3>
                    <p>${postData.preview}...</p>
                    <p><strong>Reading time:</strong> ${postData.readingTime} minutes</p>
                    <p><strong>By</strong> ${postData.author}</p>
                `;
                postsContainer.appendChild(postElement);
                localStorage.setItem
            });
        })
        .catch(error => {
            console.error('Error fetching posts:', error);
        });
}
