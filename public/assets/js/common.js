document.addEventListener('DOMContentLoaded', function () {
    // Fetch user info on page load
    axios
        .get('/auth/me')
        .then((response) => {
            const data = response.data;
            document.getElementById('user-name').textContent =
                `${data.firstName} ${data.lastName}` || 'User Name';
            document.getElementById('profile-picture').src =
                data.profilePicture || 'images/avatar/default-profile.png';
            document.getElementById('subscription-plan').textContent =
                data.subscriptionPlan || 'Free Plan';
        })
        .catch((error) => console.error('Error fetching user info:', error));

    // Logout functionality
    document
        .getElementById('logout-button')
        .addEventListener('click', function () {
            axios
                .post('/auth/logout')
                .then((response) => {
                    if (response.status === 200) {
                        window.location.href = 'index.html'; // Redirect to login page
                    } else {
                        console.error('Logout failed');
                    }
                })
                .catch((error) => console.error('Error during logout:', error));
        });
});

document.addEventListener('DOMContentLoaded', function () {
    // Initialize FilePond for each file input
    const videoPond = FilePond.create(
        document.querySelector('input[name="videoFiles"]')
    );
    const picturePond = FilePond.create(
        document.querySelector('input[name="pictureFiles"]')
    );
    const audioPond = FilePond.create(
        document.querySelector('input[name="audioFiles"]')
    );

    document
        .getElementById('videoForm')
        .addEventListener('submit', async function (event) {
            event.preventDefault();

            const messageDiv = document.getElementById('message');

            // Access files from FilePond instances
            const videoFiles = videoPond.getFiles();
            const pictureFiles = picturePond.getFiles();
            const audioFiles = audioPond.getFiles();

            // Create a new FormData object
            const formData = new FormData();

            // Append video files
            videoFiles.forEach((fileItem) => {
                formData.append('videoFiles', fileItem.file);
            });

            // Append picture files
            pictureFiles.forEach((fileItem) => {
                formData.append('pictureFiles', fileItem.file);
            });

            // Append audio files
            audioFiles.forEach((fileItem) => {
                formData.append('audioFiles', fileItem.file);
            });

            // Append other form fields
            formData.append(
                'videoLink',
                document.getElementById('videoLink').value
            );
            formData.append(
                'videoDescription',
                document.getElementById('videoDescription').value
            );
            formData.append(
                'location',
                document.getElementById('location').value
            );
            //formData.append('orientation', document.getElementById('orientation[name="options"]:checked');
            // formData.append('selectedAvatar', document.getElementById('selectedAvatar').value);

            try {
                const response = await axios.post('/submit-video', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                console.log(response.data);
                messageDiv.textContent = 'Request submitted successfully!';
                messageDiv.style.color = 'green';
            } catch (error) {
                console.error(error);
                messageDiv.textContent =
                    'An error occurred while submitting the video.';
                messageDiv.style.color = 'red';
            }
        });
});

function deleteProject(projectId) {
    axios
        .delete(`/api/project/${projectId}`)
        .then((response) => {
            //alert(response.data.message);
            updateOutputHistory();
        })
        .catch((error) => {
            console.error('Error deleting project:', error);
            alert('Error deleting project: ' + error.message);
        });
}

function updateOutputHistory() {
    axios
        .get('/api/video-status')
        .then((response) => {
            const outputHistory = document.getElementById('outputHistory');
            outputHistory.innerHTML = ''; // Clear existing entries

            response.data.forEach((video, index) => {
                const row = document.createElement('tr');
                row.className =
                    'border-b border-slate-200 dark:border-navy-500';

                const thumbnail = video.thumbnail
                    ? `<img class="w-16 h-16 object-cover rounded-md" src="${video.thumbnail}" alt="thumbnail" />`
                    : 'No Image';
                const statusBadge = video.status;

                const downloadButton =
                    video.status === 'Completed'
                        ? `<a href="${video.downloadLink}" class="btn bg-primary font-medium text-white hover:bg-primary-dark focus:bg-primary-dark active:bg-primary-darker">Download</a>`
                        : ''; // Show download link only when status is 'Completed'

                row.innerHTML = `
                    <td class="whitespace-nowrap rounded-l-lg px-4 py-3 sm:px-5">${
                        index + 1
                    }</td>
                    <td class="whitespace-nowrap px-4 py-3 sm:px-5"><div class="avatar size-24">${thumbnail}</div></td>
                    <td class="whitespace-nowrap px-4 py-3 sm:px-5">${
                        video.id
                    }</td>
                    <td class="whitespace-nowrap px-4 py-3 sm:px-5">${new Date(
                        video.createdAt
                    ).toLocaleDateString()}</td>
                    <td class="whitespace-nowrap px-4 py-3 sm:px-5">${statusBadge}</td>
                    <td class="whitespace-nowrap px-4 py-3 sm:px-5">
                        ${downloadButton}
                        <button onclick="deleteProject('${
                            video.id
                        }')" class="btn bg-slate-150 font-medium text-slate-800 hover:bg-slate-200 focus:bg-slate-200 active:bg-slate-200/80 dark:bg-navy-500 dark:text-navy-50 dark:hover:bg-success-450 dark:focus:bg-navy-450 dark:active:bg-success-450/90">Delete</button>
                    </td>
                `;

                outputHistory.appendChild(row);
            });
        })
        .catch((error) => {
            console.error('Error fetching video status:', error);
        });
}

updateOutputHistory();
// Optionally, set an interval to periodically update the output history
setInterval(updateOutputHistory, 60000); // Update every 60 seconds
