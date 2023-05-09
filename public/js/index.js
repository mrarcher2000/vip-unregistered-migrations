const domainListElement = document.querySelector('loadDomainList');


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
        } else {
            alert('Server Connection Unsuccessful! Please try again later');
        }
    });
}