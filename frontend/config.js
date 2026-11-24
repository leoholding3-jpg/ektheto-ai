const localHosts = ["localhost", "127.0.0.1"];
window.EKTHETO_API_BASE_URL = localHosts.includes(window.location.hostname)
  ? ""
  : "https://ektheto-api.onrender.com";
