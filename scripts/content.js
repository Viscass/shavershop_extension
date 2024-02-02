
let stockCount; // This will be the stock count element

const readLocalStorage = async (key) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      if (result[key] === undefined) {
        reject(`No value found for key: ${key}`);
      } else {
        resolve(result[key]);
      }
    });
  });
};

async function updateStockCount(plu) {
  if (!(await checkSession())) {
    console.log("error getting session key");
    return;
  }

  chrome.runtime.sendMessage(
    { type: "getStockCount", plus: plu },
    (response) => {
      var count = response;
      if (stockCount) {
        stockCount.textContent = "Stock count: " + count;
      }
    }
  );
}

async function checkSession() {
  try {
    let sessionKey = await readLocalStorage("key");
    let sessionExpiry = await readLocalStorage("sessionExpiry");
    if (sessionKey === undefined || sessionExpiry < Date.now() / 1000) {
      throw new Error("Session expired");
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function createStockCountContainer() {
  // Create the container block
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.right = "0";
  container.style.top = "230px";
  container.style.transform = "translateY(-50%)";
  container.style.backgroundColor = "#fff";
  container.style.padding = "10px";
  container.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.1)";
  container.style.zIndex = "1000";
  container.style.width = "300px"; // Add this line

  
  if (!(await checkSession())) {
    createLoginForm(container);
  } else {
    stockCount = createStockCountElement(container);
  }

  // Add the container block to the body
  document.body.appendChild(container);
}

function createStockCountElement(container) {
  // Create the stock count element
  const stockCount = document.createElement("p");
  stockCount.textContent = "Stock count: ?"; // You can update this value later
  container.appendChild(stockCount);
  return stockCount;
}

function createLoginForm(container) {
  // Create the login form
  const loginForm = document.createElement("form");
  loginForm.style.padding = "20px";
  container.appendChild(loginForm);

  // Create the username field
  const usernameField = document.createElement("input");
  usernameField.type = "text";
  usernameField.name = "username";
  usernameField.placeholder = "Username";
  loginForm.appendChild(usernameField);

  // Create the password field
  const passwordField = document.createElement("input");
  passwordField.type = "password";
  passwordField.name = "password";
  passwordField.placeholder = "Password";
  loginForm.appendChild(passwordField);

  // Create the submit button
  const submitButton = document.createElement("input");
  submitButton.type = "submit";
  submitButton.value = "Log in";
  loginForm.appendChild(submitButton);

  // Handle form submission
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    // Handle login here
    chrome.runtime.sendMessage(
      {
        type: "getSessionKey",
        username: usernameField.value,
        password: passwordField.value,
      },
      (response) => {
        var count = response;
        const el = document.querySelector(".brand-name");
        const badge = document.createElement("span");
        badge.classList.add("product-name");
        badge.textContent = `Count: ` + count;
        badge.style.cssFloat = "right";
        el.insertAdjacentElement("beforeend", badge);
      }
    );
  });
}

console.log("content script");
if (/[0-9]{6}/.test(window.location.href)) {
  var plu = /[0-9]{6}/.exec(window.location.href);
  console.log("plu: " + plu);

  createStockCountContainer();

  updateStockCount(plu);
}
