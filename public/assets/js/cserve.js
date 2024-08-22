// Register
document
    .getElementById('signup-form')
    .addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent default form submission

        const signupMessage = document.getElementById('signup-message');
        signupMessage.innerText = 'Loading...';
        signupMessage.style.color = 'yellow';

        const formData = new FormData(this);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[a-zA-Z])[A-Za-z\d]{6,}$/;
        // if (!passwordRegex.test(data.password)) {
        //     signupMessage.innerText = 'Password must be at least 6 characters long, include at least one uppercase letter, one lowercase letter, and one digit.';
        //     signupMessage.style.color = 'lightcoral';
        //     return;
        // }

        if (data.password !== data.confirmPassword) {
            signupMessage.innerText = 'Passwords do not match.';
            signupMessage.style.color = 'lightcoral';
            return;
        }

        try {
            const response = await axios.post('/api/signup', data);

            if (response.status === 200) {
                signupMessage.innerText = response.data.msg;
                signupMessage.style.color = 'lightgreen';
            } else {
                signupMessage.innerText = response.data.msg
                    ? response.data.msg
                    : 'Something went wrong';
                signupMessage.style.color = 'lightcoral';
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.errors) {
                signupMessage.innerText = err.response.data.errors
                    .map((error) => error.msg)
                    .join(', ');
            } else if (
                err.response &&
                err.response.data &&
                err.response.data.msg
            ) {
                signupMessage.innerText = err.response.data.msg;
            } else {
                signupMessage.innerText = 'Server error';
            }
            signupMessage.style.color = 'lightcoral';
        }
    });
