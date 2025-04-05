document.addEventListener("DOMContentLoaded", () => {
  const startBlockingButton = document.getElementById("start-blocking");
  const waitTimeInput = document.getElementById("waitTime");
  const categoriesURL =
    "https://raw.githubusercontent.com/dznfktn/list/refs/heads/main/list";

  const categoryUserMap = new Map();
  let selectedUsers = [];

  // Load the saved wait time from storage when the popup is opened
  chrome.storage.local.get(["waitTime"], (result) => {
    if (result.waitTime) {
      waitTimeInput.value = result.waitTime / 1000; // Convert milliseconds to seconds
    }
  });

  // Save the wait time to storage whenever it is changed
  waitTimeInput.addEventListener("input", () => {
    const waitTimeInSeconds = parseInt(waitTimeInput.value) || 1;
    chrome.storage.local.set({ waitTime: waitTimeInSeconds * 1000 }); // Save in milliseconds
  });

  // Fetch categories from the provided URL
  fetch(categoriesURL)
    .then((response) => response.json())
    .then((categories) => {
      const categoriesDiv = document.getElementById("categories");
      categoriesDiv.innerHTML = ""; // Clear any existing categories

      // Generate category rows
      for (const key in categories) {
        const category = categories[key];

        // Store the users in the map with the category key
        categoryUserMap.set(key, category.users);

        const categoryDiv = document.createElement("div");
        categoryDiv.className = "category";

        const infoButton = document.createElement("button");
        infoButton.className = "info-button";
        infoButton.innerHTML =
          '<img src="icons/info.svg" alt="Info" class="icon-svg">';
        infoButton.dataset.categoryKey = key;

        const categoryLabel = document.createElement("span");
        categoryLabel.className = "category-label";
        categoryLabel.innerText = category.name;

        const toggleSwitch = document.createElement("label");
        toggleSwitch.className = "switch";

        const toggleCheckbox = document.createElement("input");
        toggleCheckbox.type = "checkbox";
        toggleCheckbox.dataset.categoryKey = key;

        const sliderSpan = document.createElement("span");
        sliderSpan.className = "slider round";

        toggleSwitch.appendChild(toggleCheckbox);
        toggleSwitch.appendChild(sliderSpan);

        categoryDiv.appendChild(infoButton);
        categoryDiv.appendChild(categoryLabel);
        categoryDiv.appendChild(toggleSwitch);

        categoriesDiv.appendChild(categoryDiv);
      }

      // Add event listeners for the info buttons to open the modal
      document.querySelectorAll(".info-button").forEach((button) => {
        button.addEventListener("click", function () {
          const infoPopup = document.getElementById("infoPopup");
          const infoText = document.getElementById("infoText");
          const userButtonsContainer = document.getElementById("userButtons");

          const categoryKey = this.dataset.categoryKey;
          const category = categoryUserMap.get(categoryKey);
          infoText.innerText = categories[categoryKey].info;

          // Clear any existing buttons
          userButtonsContainer.innerHTML = "";

          // Get users from the map and create buttons
          const users = categoryUserMap.get(categoryKey);
          if (users) {
            users.forEach((user) => {
              const userButton = document.createElement("button");
              userButton.className = "button is-light user-list-item";
              userButton.innerText = `@${user.userName}`;
              userButton.style.display = "block";
              userButton.style.width = "100%";
              userButton.style.margin = "5px 0";
              userButton.style.textAlign = "left";
              userButton.onclick = function () {
                window.open(`https://x.com/i/user/${user.userId}`, "_blank");
              };
              userButtonsContainer.appendChild(userButton);
            });
          }

          infoPopup.classList.add("is-active");
        });
      });

      // Add event listeners for toggling the switches
      document
        .querySelectorAll(".switch input[type='checkbox']")
        .forEach((toggle) => {
          toggle.addEventListener("change", function () {
            const categoryKey = this.dataset.categoryKey;
            const categoryUsers = categoryUserMap.get(categoryKey);

            if (this.checked) {
              // Add users from this category to the selected users list
              selectedUsers = selectedUsers.concat(categoryUsers);
            } else {
              // Remove users from this category from the selected users list
              selectedUsers = selectedUsers.filter(
                (user) => !categoryUsers.includes(user)
              );
            }

            console.log("Updated selected users list:", selectedUsers);
          });
        });
    })
    .catch((error) => {
      console.error("Error fetching categories:", error);
    });

  // Function to close the info modal
  document.getElementById("closeInfo").addEventListener("click", function () {
    const infoPopup = document.getElementById("infoPopup");
    infoPopup.classList.remove("is-active");
  });

  function checkProcessStatus() {
    chrome.runtime.sendMessage(
      { message: "checkProcessStatus" },
      function (response) {
        console.log(response.isBlocking);
        if (response && response.isBlocking) {
          startBlockingButton.disabled = true;
          startBlockingButton.textContent =
            "Bloklama Sürüyor: %" + (response.completePercentage || 0);
        } else {
          startBlockingButton.disabled = false;
          startBlockingButton.textContent = "ᐅ Bloklamaya Başla";
        }
      }
    );
  }

  checkProcessStatus();

  // Set up a timer to periodically check the status every second (1000 milliseconds)
  const statusCheckInterval = setInterval(checkProcessStatus, 500);

  // Clear the interval when the popup is closed (optional)
  window.addEventListener("unload", () => {
    clearInterval(statusCheckInterval);
  });

  // Start blocking selected users
  startBlockingButton.addEventListener("click", () => {
    chrome.storage.local.get(["waitTime"], (result) => {
      const baseWaitTime = result.waitTime || 2000; // Default to 2 second if not specified
      const maxRandomAddition = 3000; // Maximum random addition in milliseconds

      // Add additional usernames from the text area
      const additionalUsernames = document
        .getElementById("additionalUsernames")
        .value.split(",")
        .map((user) => user.trim())
        .filter((user) => user.length > 0);

      const additionalUsers = additionalUsernames.map((username) => ({
        userName: username,
        userId: null,
      }));

      // Combine selected users from categories with additional usernames
      const finalUsersList = selectedUsers.concat(additionalUsers);

      // Check if any users are selected before proceeding
      if (finalUsersList.length === 0) {
        alert("No users selected for blocking.");
        return;
      }

      // Save and start the blocking process
      chrome.storage.local.set({ usersList: finalUsersList }, () => {
        startBlockingButton.disabled = true; // Disable the button immediately when blocking starts
        startBlockingButton.textContent = "Bloklama Sürüyor:";
        chrome.runtime.sendMessage({
          action: "startBlocking",
          usersList: finalUsersList,
          waitTime: baseWaitTime,
          maxRandomAddition: maxRandomAddition
        });
      });

      // Start blocking process
      startBlockingButton.disabled = true; // Disable the button immediately when blocking starts
      let blockedCount = 0;
      const totalUsers = finalUsersList.length;

      const blockNextUser = () => {
        if (blockedCount < totalUsers) {
          const user = finalUsersList[blockedCount];
          // Simulate blocking user (replace with actual blocking logic)
          console.log(`Blocking ${user.userName || "unknown user"}`);

          blockedCount++;
          const percentage = Math.round((blockedCount / totalUsers) * 100);
          startBlockingButton.textContent = `Bloklama Sürüyor: % ${percentage}`;

          // Calculate a random wait time: base time + random additional time
          const randomAddition = Math.floor(Math.random() * maxRandomAddition);
          const totalWaitTime = baseWaitTime + randomAddition;
          console.log(`Waiting ${totalWaitTime}ms before next block`);

          // Wait and then block the next user with randomized timing
          setTimeout(blockNextUser, totalWaitTime);
        } else {
          startBlockingButton.textContent = "Blocking Complete";
          button.disabled = false; // Re-enable the button after completion
        }
      };

      blockNextUser(); // Start the blocking process
    });
  });

  // Load the saved additional usernames when the popup is opened
  chrome.storage.local.get(["additionalUsernames"], (result) => {
    if (result.additionalUsernames) {
      document.getElementById("additionalUsernames").value =
        result.additionalUsernames.join(", ");
    }
  });

  // Function to open the settings modal
  document
    .querySelector(".settings-button")
    .addEventListener("click", function () {
      const settingsModal = document.getElementById("settingsModal");
      settingsModal.classList.add("is-active");
    });

  // Function to close the settings modal
  document
    .getElementById("closeSettings")
    .addEventListener("click", function () {
      const settingsModal = document.getElementById("settingsModal");
      settingsModal.classList.remove("is-active");
    });
});
