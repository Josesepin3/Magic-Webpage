(function () {
  window.MagicOS = window.MagicOS || {};

  MagicOS.api = {
    get: function (url) {
      return fetch(url, { headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('Error ' + r.status);
          return r.json();
        });
    },

    post: function (url, data) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error('Error ' + r.status);
        return r.json();
      });
    }
  };
})();