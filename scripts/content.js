async function checkSession() {
  try {
    let sessionKey = await StorageManager.readLocalStorage("key");
    let sessionExpiry = await StorageManager.readLocalStorage("sessionExpiry");
    if (sessionKey === undefined || sessionExpiry < Date.now() / 1000) {
      return false;
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

class Content {
  constructor(plu) {
    this.stockCount = null;
    this.loginForm = null;
    this.container = null;
    this.stockInfo = null;
    this.plu = plu;

    this.createMainContainer();
  }

  async createMainContainer() {
    // Create the container block
    this.container = document.createElement("div");
    this.container.style.position = "fixed";
    this.container.style.right = "0";
    this.container.style.top = "230px";
    this.container.style.transform = "translateY(-50%)";
    this.container.style.backgroundColor = "#fff";
    this.container.style.padding = "10px";
    this.container.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.25)";
    this.container.style.zIndex = "1000";
    this.container.style.width = "330px";
    // Add the container block to the body
    document.body.appendChild(this.container);

    this.stockCount = new StockCount(this.container);
    this.loginForm = new LoginForm(this.container, this.logInSuccess.bind(this));

    const sessionValid = await checkSession();

    if (sessionValid) {
      this.logInSuccess();
    } else {
      this.loginForm.show();
    }
  }

  async logInSuccess() {
    await this.fetchStockInfo(this.plu);
    this.stockCount.updateStockCount(this.stockInfo);
    this.stockCount.show();
    this.loginForm.hide();
  }

  async fetchStockInfo(plu) {
    if (!(await checkSession())) {
      console.log("Invalid session key");
      return;
    }
  
    chrome.runtime.sendMessage(
      { type: "getWarehousesStockCount", plus: plu },
      (response) => {
        this.stockInfo = response;
        console.log("Stock info: ", response);          

      }
    );
  }

}

class LoginForm {
  constructor(container, logInSuccess) {
    this.container = container;
    this.logInSuccess = logInSuccess;
    this.form = this.createLoginForm();
  }

  createLoginForm() {
    // Create the login form
    const loginForm = document.createElement("form");
    loginForm.style.padding = "20px";
    this.container.appendChild(loginForm);

    // Create the username field
    this.usernameField = document.createElement("input");
    this.usernameField.type = "text";
    this.usernameField.name = "username";
    this.usernameField.placeholder = "Username";
    loginForm.appendChild(this.usernameField);

    // Create the password field
    this.passwordField = document.createElement("input");
    this.passwordField.type = "password";
    this.passwordField.name = "password";
    this.passwordField.placeholder = "Password";
    loginForm.appendChild(this.passwordField);

    // Create the submit button
    const submitButton = document.createElement("input");
    submitButton.type = "submit";
    submitButton.value = "Log in";
    loginForm.appendChild(submitButton);

    // Handle form submission
    loginForm.addEventListener("submit", this.handleSubmit.bind(this));

    return loginForm;
  }

  handleSubmit(event) {
    event.preventDefault();
    // Handle login here
    chrome.runtime.sendMessage(
      {
        type: "logIn",
        username: this.usernameField.value,
        password: this.passwordField.value,
      },
      (response) => {
        if (response.success) {
          console.log("Login successful");
          this.logInSuccess();
        } else {
          console.log("Login failed");
          alert("Login failed");
        }
      }
    );
  }

  show() {
    this.form.style.display = "block";
  }

  hide() {
    this.form.style.display = "none";
  }

}

class StockCount {
  constructor(container) {
    this.container = container;
    this.warehouseID = 5000000091; // Upper Mt Gravatt;
    this.createStockCountElement();
  }

  createStockCountElement() {
    // Create the stock count element
    this.stockCount = document.createElement("p");
    this.stockCount.textContent = "Stock count: ?"; // update this value later
    this.stockCount.style.display = "none"; // hide initially
    this.container.appendChild(this.stockCount);
  }

  updateStockCount(stockInfo) {
    this.stockCount.textContent = "Stock count: " + stockInfo[this.warehouseID];
  }
  
  show() {
    this.stockCount.style.display = "block";
  }

  hide() {
    this.stockCount.style.display = "none";
  }
}

// async function showPopup() {
//   const popup = document.createElement("div");
//   popup.style.position = "fixed";
//   popup.style.left = "50%";
//   popup.style.top = "50%";
//   popup.style.transform = "translate(-50%, -50%)";
//   popup.style.backgroundColor = "#eee";
//   popup.style.padding = "20px";
//   popup.style.zIndex = "1001";
//   popup.style.maxHeight = "400px"; // Set a maximum height
//   popup.style.overflowY = "auto"; // Enable vertical scrolling

//   const warehouseSelectText = document.createElement("p");
//   warehouseSelectText.textContent = "Select a warehouse:";
//   warehouseSelectText.style.marginBottom = "10px";
//   warehouseSelectText.appendChild(popup);

//   chrome.runtime.sendMessage({ type: "getWareHouses" }, (warehouses) => {
//     console.log(warehouses);
//     const list = document.createElement("ul");
//     warehouses.forEach((warehouse) => {
//       const listItem = document.createElement("li");
//       listItem.textContent = warehouse.name;
//       listItem.addEventListener("click", () => selectWarehouse(warehouse));
//       list.appendChild(listItem);
//     });
//     popup.appendChild(list);
//   });

//   document.body.appendChild(popup);
// }

// // Add this function to handle warehouse selection
// function selectWarehouse(warehouse) {
//   chrome.storage.local.set({ warehouse: warehouse }, function () {
//     console.log(
//       "Warehouse selected: " + warehouse.name + " (" + warehouse.id + ")"
//     );
//   });
// }

function getCurrentPluFromUrl() {
  var plu = /[0-9]{6}/.exec(window.location.href);
  console.log("plu: " + plu);
  return plu;
}

function checkURLforPlu() {
  return /[0-9]{6}/.test(window.location.href);
}

if (checkURLforPlu()) {
  new Content(getCurrentPluFromUrl());
}
