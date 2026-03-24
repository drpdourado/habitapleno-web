const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/condo/sync',
  method: 'GET',
  headers: {
    'x-condo-id': 'vista-verde-01'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.data && parsed.data.dashboardStats) {
        console.log("DASHBOARD STATS OK: ", parsed.data.dashboardStats);
      } else {
        console.log("RESPONSE WITHOUT DASHBOARD STATS: ", parsed);
      }
    } catch (e) {
      console.log("ERROR PARSING JSON: ", data.slice(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});
req.end();
