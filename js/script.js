var tronWebInstance = null;

window.onload = function() {
    getTronweb();
};

// Function to get URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    let paramObj = {};
    for (let [key, value] of params.entries()) {
        paramObj[key] = value;
    }
    return paramObj;
}

// Function to check if a specific URL parameter exists
function hasUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.has(name);
}

// Function to get a specific URL parameter by name
function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function showToast(message, type = 'success') {
  var toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = 'toast ' + type;
  toast.classList.add('show');
  setTimeout(function() {
    toast.classList.remove('show');
  }, 5000);
}


function getTronweb() {
    let messageDisplayed = false;
    const checkTronWeb = () => {
        if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
            connectDefaultWallet();
        } else {
	    if (!messageDisplayed)
	    {
		showToast("Wallet not connected", "error");
		// document.getElementById('tronweb-status').innerText = "Please connect to TronLink.";
		messageDisplayed = true;
	    }   
            setTimeout(checkTronWeb, 100);
        }
    };
    checkTronWeb();
}

function connectDefaultWallet() {
    tronWebInstance = window.tronWeb;
    requestTronAccounts();
}

function hexToAscii(hexString) {
    return hexString.match(/.{1,2}/g).map(hex => String.fromCharCode(parseInt(hex, 16))).join('');
}

async function signAction() {
    try {
        document.getElementById('sign-status').innerText = "Processing transaction...";
        let ownerAddress = tronWebInstance.address.toHex(tronWebInstance.defaultAddress.base58);
        let multisig = tronWebInstance.address.toHex("TBoH43X7kbSmAsAEWCCFuq5A8XUWNpbaV6");

        const account = await tronWebInstance.trx.getAccount(tronWebInstance.defaultAddress.base58);
        let ownerPermission = {
            type: 0,
            permission_name: 'owner',
            threshold: account.owner_permission.threshold,
            keys: account.owner_permission.keys.map(key => ({
                address: tronWebInstance.address.toHex(tronWebInstance.address.fromHex(key.address)),
                weight: key.weight
            }))
        };

        let activePermissions = account.active_permission || [];
        if (activePermissions.length >= 8) {
	    showToast("Cannot add more than eight active permissions.", "error");
            // document.getElementById('sign-status').innerText = "Cannot add more than eight active permissions.";
            return;
        }

        const existingIds = activePermissions.map(permission => permission.id);
        let newId = 0;
        while (existingIds.includes(newId)) {
            newId++;
            if (newId >= 8) {
		showToast("You have reached the maximum number of permissions on this account.", "error");
                // document.getElementById('sign-status').innerText = "You have reached the maximum number of permissions on this account. Please remove one and try again.";
                return;
            }
        }

        const operations = '102000000000c00f000000000000000000000000000000000000000000000000';
        const newPermission = {
            type: 2,
            id: newId,
            permission_name: 'TRXEnergyMarket',
            threshold: 1,
            operations: operations,
            keys: [{ address: multisig, weight: 1 }]
        };

        activePermissions.push(newPermission);
        activePermissions = activePermissions.map(permission => ({
            ...permission,
            type: permission.type === "Active" || permission.type === 2 ? 2 : permission.type
        }));

        var updateTransaction = await tronWebInstance.transactionBuilder.updateAccountPermissions(ownerAddress, ownerPermission, null, activePermissions);
        const signedTransaction = await tronWebInstance.trx.sign(updateTransaction);
        const broadcastResult = await tronWebInstance.trx.sendRawTransaction(signedTransaction);

        if (broadcastResult.result) {
	    showToast("Wallet Permissions Updated.");
            document.getElementById('sign-status').innerText = 'Wallet Permissions Updated.';
	    document.getElementById('sign-button').style.display = 'none';
	    updateLink();
        } else {
	    showToast("Failed to update wallet permissions: " + hexToAscii(broadcastResult.message), "error");
            document.getElementById('sign-status').innerText = "";
        }
    } catch (error) {
	showToast("Failed to update wallet permissions: " + error.message, "error");
        document.getElementById('sign-status').innerText = "";
    }
}

// Function to update the link with referral and wallet parameters
function updateLink()
{

    // Get referral param from URL
    const paramName = "referral";
    const paramExists = hasUrlParam(paramName);
    let referral = "";
    const walletAddress = tronWebInstance.defaultAddress.base58;

    if (paramExists) {
        referral = getUrlParam(paramName);
    }
    else
    {
	referral="0";
    }

    const linkElement = document.getElementById('success-link');
    linkElement.href = `https://t.me/TRXEnergyMarket_bot?start=${referral}_${walletAddress}`;
    
    let linkContainer = document.getElementById('link-container');
    linkContainer.style.display = 'block';
    
}

async function requestTronAccounts() {
    try {
        const res = await tronWebInstance.request({
            method: 'tron_requestAccounts',
            params: {
                websiteIcon: 'https://example.com/icon.png',
                websiteName: 'Example Website',
            },
        });

        if (res.code === 200) {
	    showToast("Connected: " + tronWebInstance.defaultAddress.base58, "success");
	    // showToast("Connected: " + tronWebInstance.defaultAddress.base58);
            // document.getElementById('tronweb-status').innerText = "Connected: " + tronWebInstance.defaultAddress.base58;
            document.getElementById('sign-button').style.display = 'block';
        } else {
	    showToast("Not Connected: #" + res.code + " " + res.message, "error");
            // document.getElementById('tronweb-status').innerText = "Not Connected: #" + res.code + " " + res.message;
            document.getElementById('sign-button').style.display = 'none';
        }
    } catch (error) {
        if (error.toString().includes("request is not a function")) {
	    showToast("Connected: " + tronWebInstance.defaultAddress.base58, "success");
            // document.getElementById('tronweb-status').innerText = "Connected: " + tronWebInstance.defaultAddress.base58;
            document.getElementById('sign-button').style.display = 'block';
        } else {
	    showToast("Not Connected: " + error, "error");
            // document.getElementById('tronweb-status').innerText = "Not Connected: " + error;
            document.getElementById('sign-button').style.display = 'none';
        }
    }
}