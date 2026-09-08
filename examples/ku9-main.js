// Illustrative Ku9 script; example.test is a placeholder, not a playable service.
// Can also be used as a CJS main.js with jsApi: "ku9"; no alternate JS API needed.
function main(item) {
    var id = ku9.getQuery(item.url, "id");
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new Error("invalid channel id");
    var key = "example-url-v1:" + id;
    var cached = ku9.getCache(key);
    if (cached) return cached;

    var response = ku9.request("https://api.example.test/live?id=" + encodeURIComponent(id),
        "GET", {"Accept": "application/json"});
    if (response.code !== 200) throw new Error("HTTP " + response.code);
    var data = JSON.parse(response.body);
    if (!data.url || !/^https?:\/\//.test(data.url)) throw new Error("missing media URL");
    ku9.setCache(key, data.url, 30000); // Ku9 TTL is milliseconds.
    return {url: data.url};
}
