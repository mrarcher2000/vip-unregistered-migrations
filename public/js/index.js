const domainListElement = document.querySelector('#domainList');
const pleaseWaitElement = document.querySelector('#loadDomainList');
const submitDiv = document.querySelector('#submitdiv');
const runReport = document.querySelector('#runReport');
const errorMessage = document.querySelector('#errorMessage');
const successMessage = document.querySelector('#successMessage');


let ns_access = "";

window.onload = function() {
    const response = fetch('https://crexendo-core-021-las.cls.iaas.run/ns-api/oauth2/token/?grant_type=password&client_id=archertest&client_secret=90056b1f11f8c87fff30fd1b5acafd04&username=anicholson@crexendo.com&password=Crexendo2022!', {
        method: 'POST'
    })
    .then((response) => response.json())
    .then((response) => {
        if (response.access_token) {
            ns_access = response.access_token;
            console.log('Server Connection Successful');
            pullDomains();
        } else {
            alert('Server Connection Unsuccessful! Please try again later');
        }
    });
}

var dhttp = new XMLHttpRequest();

var listedDomains = [];
var unregisteredDevices = [];
var requestCount = 0;
var responseCount = 0;
var reportDownloadCount = 0;

const pullDomains= function() {
    dhttp.open("POST", 'https://api.crexendovip.com/ns-api/?object=domain&action=read');
    dhttp.setRequestHeader("Authorization", `Bearer ${ns_access}`);
    dhttp.send('{"domain":""}');
};

const unique = function(domainArray) {
    var seen = {};
    return domainArray.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}


dhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200){
        console.log('Domains loading...');
        if (dhttp.responseXML.getElementsByTagName("domain")) {
            // console.log(dhttp.responseXML.getElementsByTagName("domain"));
            let fullDomainXML = dhttp.responseXML.getElementsByTagName("domain");
            for (i=0; i < fullDomainXML.length; i++) {
                // console.log(fullDomainXML[i]);
                listedDomains.push(fullDomainXML[i].firstChild.textContent);
            }
        }

        domainsToHTML(unique(listedDomains));
    }
}

const domainsToHTML = function(domains) {
    for (i=0; i<domains.length; i++) {
        domainListElement.insertAdjacentHTML("beforeend", `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${domains[i]}" id="checkboxFor${domains[i]}">
            <label class="form-check-label" for="checkboxFor${domains[i]}">
            ${domains[i]}
            </label>
        </div>`
    )};
    pleaseWaitElement.innerHTML = "";
    submitDiv.style.display = "inline";
}

const parseCheckedValues = function() {
    let checkedDomains = document.querySelectorAll('.form-check-input:checked');
    let parsedDomains = [];
    checkedDomains.forEach(element => {
        parsedDomains.push(element.value);
    });

    requestCheckedDomains(parsedDomains);
};

const requestCheckedDomains = function(checkedDomainValues) {
    for (i=0; i< checkedDomainValues.length; i++) {
        let reqBody = `{"domain": "${checkedDomainValues[i]}", "mode":"unregistered_endpoint"}`;
        let unknownReqBody = `{"domain": "${checkedDomainValues[i]}", "mode": "unknown"}`;
        startRequest(reqBody);
        startRequest(unknownReqBody);
    }
}

const startRequest = function(reqBody) {
    var uhttp = new XMLHttpRequest();
    uhttp.open('POST', "https://api.crexendovip.com/ns-api/?object=device&action=read");
    uhttp.setRequestHeader("Authorization", `Bearer ${ns_access}`);
    uhttp.send(reqBody);
    requestCount++;

    uhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log(uhttp.responseXML);
            let parentNode = uhttp.responseXML.getElementsByTagName("device");
            readResponse(parentNode);
            errorMessage.style.display = "none";
            successMessage.style.display = "inline";
            // let subscriber_domain = parentNode[0].getElementsByTagName("subscriber_domain").textContent;
        } else {
            //console.log(this.responseText);
        }
    }
}

const isNumber = function(ext) {
    const extPattern = /^\d+$/.test(ext);
    return extPattern;
}

const readResponse = function (xmlParent) {
    if (!xmlParent) {
        errorMessage.style.display = "inline";
        successMessage.style.display = "none";
    }
    console.log(xmlParent);
    for (i=0; i<xmlParent.length; i++) {
        let aor = xmlParent[i].childNodes[1].textContent;
        let indexOfSip = aor.indexOf(":");
        let indexOfUser = aor.indexOf("@");
        let aorUser = aor.slice((indexOfSip + 1), indexOfUser);
        let domain = xmlParent[i].childNodes[7].textContent;
        let sub_login = xmlParent[i].childNodes[16].textContent;
        let mac = "";
        let model = "";
        if (xmlParent[i].lastChild.nodeName == "ndperror") {
            mac = "-";
            model = "-";
        }

        if (xmlParent[i].lastChild.nodeName == "line") {
            mac = xmlParent[i].lastChild.previousSibling.previousSibling.previousSibling.previousSibling.textContent;
            model = xmlParent[i].lastChild.previousSibling.previousSibling.previousSibling.textContent;
        }
        // let login = xmlParent[i].getElementsByTagName("sub_login").textContent;
        // let mac = xmlParent[i].getElementsByTagName("mac").textContent || "";
        // let model = xmlParent[i].getElementsByTagName("model").textContent || xmlParent[i].getElementsByTagName("user_agent").textContent;

        console.log(`Domain: ${domain} \n Subscriber: ${sub_login} \n Mac: ${mac} \n Model: ${model} \n User: ${aorUser}`); 
        if (isNumber(aorUser)) {
            let singleDevice = {
                "Domain": `${domain}`,
                "Subscriber": `${sub_login}`,
                "Mac": `${mac}`,
                "Model": `${model}`
            }

            unregisteredDevices.push(singleDevice);
        }
    }

    responseCount++;
    generateCSV(unregisteredDevices);
    generateNewWindow(unregisteredDevices);
}

const generateNewWindow = function(unregDeviceArray) {
    let newWindowHead = 
    `
    <!DOCTYPE html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="Unregistered Devices" />
        <meta name="author" content="CrexendoVIP Archer Nicholson VoIP Engineer" />
        <title>Unregistered Device Report</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
    </head>
    <table class="table table-striped">
        <thead>
            <tr>
                <th scope="col">Domain</th>
                <th scope="col">Subscriber</th>
                <th scope="col">Mac Address</th>
                <th scope="col">Device Model</th>
            </tr>
        </thead>
        <tbody>

    `;

    for (i=0;i<unregDeviceArray.length; i++) {
        let unregDomain = unregDeviceArray[i].Domain;
        let unregSubscriber = unregDeviceArray[i].Subscriber;
        let unregMac = unregDeviceArray[i].Mac;
        let unregModel = unregDeviceArray[i].Model;

        let appendToWindow = `
        <tr>
            <td>${unregDomain}</td>
            <td>${unregSubscriber}</td>
            <td>${unregMac}</td>
            <td>${unregModel}</td>
        </tr>
        `;

        newWindowHead += appendToWindow;

        // console.log(newWindowHead);
    }

    if (reportDownloadCount == 1) {
        var win = window.open("", "_blank");
        win.document.body.innerHTML = (newWindowHead + `</tbody></table>`);
        setTimeout(pageReset, 5000);
    }
    
}

const generateCSV = function (devicesToCSV) {
    // TO DO:: ADD REQUESTCOUNT AND RESPONSECOUNT TO THIS SO FUNCTION ONLY RUNS ONCE NUMBERS MATCH. MAY NEED TO MOVE WHERE COUNTERS ARE
    console.log('responseCount = ' + responseCount + ' requestCount = ' + requestCount + ' and reportDownloadCount = ' + reportDownloadCount);
    var csvHeaders = Object.keys(devicesToCSV[0]).toString();
    console.log(csvHeaders);
    
    var csvData = devicesToCSV.map((item) => {
        return Object.values(item).toString();
    });

    var csv = [csvHeaders, ...csvData].join('\n');

    if (requestCount == responseCount && reportDownloadCount == 0) {
        try{
            downloadCSV(csv);
        } catch (e) {
            console.log(e);
            errorMessage.style.display = "inline";
            successMessage.style.display = "none";
        }
    }
};

const downloadCSV = function(csv) {
    reportDownloadCount++;
    const csvBlob = new Blob([csv], { type: 'application/csv' });
    const url = URL.createObjectURL(csvBlob);
    var csvAnchor = document.createElement('a');
    csvAnchor.download = 'unregistered-devices.csv';
    csvAnchor.href = url;
    csvAnchor.style.display = 'none';

    document.body.appendChild(csvAnchor);
    csvAnchor.click();
    csvAnchor.remove();
    URL.revokeObjectURL(url);
}

const pageReset = function() {
    if (reportDownloadCount == 1) {
        unregisteredDevices = [];
        requestCount = 0;
        responseCount = 0;
        reportDownloadCount = 0;
        console.log(`Page has been reset. \n Devices: ${unregisteredDevices} \n reportDownloadCount = ${reportDownloadCount}`);
    }
}

runReport.addEventListener("click", (e) => {
    e.preventDefault();
    parseCheckedValues();
})