!(function (e, t) {
  'object' == typeof exports && 'object' == typeof module
    ? (module.exports = t())
    : t();
})(this, function () {
  function e(e) {
    if (!e) return !1;
    var t = Object.prototype.toString.call(e);
    return '[object Function]' == t || '[object AsyncFunction]' == t;
  }
  function t() {
    return Date.now && e(Date.now) ? Date.now() : new Date().getTime();
  }
  function r(e) {
    return null != e && '[object Object]' == Object.prototype.toString.call(e);
  }
  function n() {
    if ('function' == typeof Uint32Array) {
      var e = '';
      if (
        ('undefined' != typeof crypto
          ? (e = crypto)
          : 'undefined' != typeof msCrypto && (e = msCrypto),
        r(e) && e.getRandomValues)
      ) {
        var t = new Uint32Array(1),
          n = e.getRandomValues(t)[0],
          i = Math.pow(2, 32);
        return n / i;
      }
    }
    return _i(1e19) / 1e19;
  }
  function i(e) {
    var t = null;
    try {
      t = JSON.parse(e);
    } catch (r) {}
    return t;
  }
  function a(e, t) {
    (this.lockGetPrefix = e || 'lock-get-prefix'),
      (this.lockSetPrefix = t || 'lock-set-prefix');
  }
  function s(e) {
    return (
      'function' == typeof e || (!(!e || 'object' != typeof e) && s(e.listener))
    );
  }
  function l() {
    this._events = {};
  }
  function u(e) {
    var t = e;
    try {
      t = decodeURIComponent(e);
    } catch (r) {
      t = e;
    }
    return t;
  }
  function c(e) {
    e = e || '';
    for (
      var t = {}, r = e.substring(1), n = r.split('&'), i = 0;
      i < n.length;
      i++
    ) {
      var a = n[i].indexOf('=');
      if (a !== -1) {
        var s = n[i].substring(0, a),
          o = n[i].substring(a + 1);
        (s = u(s)), (o = u(o)), (t[s] = o);
      }
    }
    return t;
  }
  function d(e) {
    return '[object String]' == Object.prototype.toString.call(e);
  }
  function p(e) {
    return e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  }
  function f(e) {
    var t = function (e) {
      (this._fields = {
        Username: 4,
        Password: 5,
        Port: 7,
        Protocol: 2,
        Host: 6,
        Path: 8,
        URL: 0,
        QueryString: 9,
        Fragment: 10,
      }),
        (this._values = {}),
        (this._regex =
          /^((\w+):\/\/)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#]+)?\??([^#]+)?#?(\w*)/),
        'undefined' != typeof e && this._parse(e);
    };
    return (
      (t.prototype.setUrl = function (e) {
        this._parse(e);
      }),
      (t.prototype._initValues = function () {
        for (var e in this._fields) this._values[e] = '';
      }),
      (t.prototype.addQueryString = function (e) {
        if ('object' != typeof e) return !1;
        var t = this._values.QueryString || '';
        for (var r in e)
          t = new RegExp(r + '[^&]+').test(t)
            ? t.replace(new RegExp(r + '[^&]+'), r + '=' + e[r])
            : '&' === t.slice(-1)
            ? t + r + '=' + e[r]
            : '' === t
            ? r + '=' + e[r]
            : t + '&' + r + '=' + e[r];
        this._values.QueryString = t;
      }),
      (t.prototype.getUrl = function () {
        var e = '';
        return (
          (e += this._values.Origin),
          (e += this._values.Port ? ':' + this._values.Port : ''),
          (e += this._values.Path),
          (e += this._values.QueryString ? '?' + this._values.QueryString : ''),
          (e += this._values.Fragment ? '#' + this._values.Fragment : '')
        );
      }),
      (t.prototype._parse = function (e) {
        this._initValues();
        var t = this._regex.exec(e);
        t || pi.log('URLParser::_parse -> Invalid URL');
        var r = e.split('#'),
          n = r[0],
          i = r.slice(1).join('#');
        t = this._regex.exec(n);
        for (var a in this._fields)
          'undefined' != typeof t[this._fields[a]] &&
            (this._values[a] = t[this._fields[a]]);
        (this._values.Hostname = this._values.Host.replace(/:\d+$/, '')),
          (this._values.Origin =
            this._values.Protocol + '://' + this._values.Hostname),
          (this._values.Fragment = i);
      }),
      new t(e)
    );
  }
  function _(e) {
    var t = {},
      r = function () {
        var e;
        try {
          return (
            (e = new URL('https://www.sensorsdata.cn/')),
            'https://www.sensorsdata.cn/' === e.href
          );
        } catch (t) {
          return !1;
        }
      };
    if ('function' == typeof window.URL && r())
      (t = new URL(e)),
        t.searchParams ||
          (t.searchParams = (function () {
            var e = c(t.search);
            return {
              get: function (t) {
                return e[t];
              },
            };
          })());
    else {
      d(e) || (e = String(e)), (e = p(e));
      var n = /^https?:\/\/.+/;
      if (n.test(e) === !1) return void pi.log('Invalid URL');
      var i = f(e);
      (t.hash = i._values.Fragment),
        (t.host = i._values.Host
          ? i._values.Host + (i._values.Port ? ':' + i._values.Port : '')
          : ''),
        (t.href = i._values.URL),
        (t.password = i._values.Password),
        (t.pathname = i._values.Path),
        (t.port = i._values.Port),
        (t.search = i._values.QueryString ? '?' + i._values.QueryString : ''),
        (t.username = i._values.Username),
        (t.hostname = i._values.Hostname),
        (t.protocol = i._values.Protocol ? i._values.Protocol + ':' : ''),
        (t.origin = i._values.Origin
          ? i._values.Origin + (i._values.Port ? ':' + i._values.Port : '')
          : ''),
        (t.searchParams = (function () {
          var e = c('?' + i._values.QueryString);
          return {
            get: function (t) {
              return e[t];
            },
          };
        })());
    }
    return t;
  }
  function g(e) {
    return !(!e || 1 !== e.nodeType);
  }
  function h(e) {
    return void 0 === e;
  }
  function v(t) {
    return Array.isArray && e(v)
      ? Array.isArray(t)
      : '[object Array]' === Object.prototype.toString.call(t);
  }
  function y(e) {
    return new hi(e);
  }
  function b(e, t, r, n) {
    function i(e) {
      return (
        e &&
          ((e.preventDefault = i.preventDefault),
          (e.stopPropagation = i.stopPropagation),
          (e._getPath = i._getPath)),
        e
      );
    }
    function a(e, t, r, n) {
      var a = function (a) {
        if ((a = a || i(window.event))) {
          a.target = a.srcElement;
          var s,
            o,
            l = !0;
          return (
            'function' == typeof r && (s = r(a)),
            (o = t.call(e, a)),
            'beforeunload' !== n
              ? ((!1 !== s && !1 !== o) || (l = !1), l)
              : void 0
          );
        }
      };
      return a;
    }
    (i._getPath = function () {
      var e = this;
      return (
        this.path ||
        (this.composedPath && this.composedPath()) ||
        y(e.target).getParents()
      );
    }),
      (i.preventDefault = function () {
        this.returnValue = !1;
      }),
      (i.stopPropagation = function () {
        this.cancelBubble = !0;
      });
    var s = function (e, t, r) {
      if ((void 0 === n && 'click' === t && (n = !0), e && e.addEventListener))
        e.addEventListener(
          t,
          function (e) {
            (e._getPath = i._getPath), r.call(this, e);
          },
          n,
        );
      else {
        var s = 'on' + t,
          o = e[s];
        e[s] = a(e, r, o, t);
      }
    };
    s.apply(null, arguments);
  }
  function w(e) {
    var t = 'pushState' in window.history ? 'popstate' : 'hashchange';
    b(window, t, e);
  }
  function S(e) {
    if (e)
      return 'undefined' != typeof window.XMLHttpRequest &&
        'withCredentials' in new XMLHttpRequest()
        ? new XMLHttpRequest()
        : 'undefined' != typeof XDomainRequest
        ? new XDomainRequest()
        : null;
    if ('undefined' != typeof window.XMLHttpRequest)
      return new XMLHttpRequest();
    if (window.ActiveXObject)
      try {
        return new ActiveXObject('Msxml2.XMLHTTP');
      } catch (t) {
        try {
          return new ActiveXObject('Microsoft.XMLHTTP');
        } catch (t) {
          pi.log(t);
        }
      }
  }
  function k(e, t, r) {
    if (null == e) return !1;
    if (vi && e.forEach === vi) e.forEach(t, r);
    else if (v(e))
      for (var n = 0, i = e.length; n < i; n++) n in e && t.call(r, e[n], n, e);
    else for (var a in e) yi.call(e, a) && t.call(r, e[a], a, e);
  }
  function P(e) {
    return (
      k(Array.prototype.slice.call(arguments, 1), function (t) {
        for (var r in t) bi.call(t, r) && void 0 !== t[r] && (e[r] = t[r]);
      }),
      e
    );
  }
  function C(e) {
    function t(e) {
      if (!e) return '';
      try {
        return JSON.parse(e);
      } catch (t) {
        return {};
      }
    }
    function n() {
      try {
        i && 'object' == typeof i && i.abort && i.abort();
      } catch (t) {
        pi.log(t);
      }
      a &&
        (clearTimeout(a),
        (a = null),
        e.error && e.error(),
        (i.onreadystatechange = null),
        (i.onload = null),
        (i.onerror = null));
    }
    (e.timeout = e.timeout || 2e4),
      (e.credentials = 'undefined' == typeof e.credentials || e.credentials);
    var i = S(e.cors);
    if (!i) return !1;
    e.type || (e.type = e.data ? 'POST' : 'GET'),
      (e = P({ success: function () {}, error: function () {} }, e));
    var a,
      s = e.success,
      o = e.error;
    (e.success = function (e) {
      s(e), a && (clearTimeout(a), (a = null));
    }),
      (e.error = function (e) {
        o(e), a && (clearTimeout(a), (a = null));
      }),
      (a = setTimeout(function () {
        n();
      }, e.timeout)),
      'undefined' != typeof XDomainRequest &&
        i instanceof XDomainRequest &&
        ((i.onload = function () {
          e.success && e.success(t(i.responseText)),
            (i.onreadystatechange = null),
            (i.onload = null),
            (i.onerror = null);
        }),
        (i.onerror = function () {
          e.error && e.error(t(i.responseText), i.status),
            (i.onreadystatechange = null),
            (i.onerror = null),
            (i.onload = null);
        })),
      (i.onreadystatechange = function () {
        try {
          4 == i.readyState &&
            ((i.status >= 200 && i.status < 300) || 304 == i.status
              ? e.success(t(i.responseText))
              : e.error(t(i.responseText), i.status),
            (i.onreadystatechange = null),
            (i.onload = null));
        } catch (r) {
          (i.onreadystatechange = null), (i.onload = null);
        }
      }),
      i.open(e.type, e.url, !0);
    try {
      e.credentials && (i.withCredentials = !0),
        r(e.header) &&
          k(e.header, function (e, t) {
            i.setRequestHeader && i.setRequestHeader(t, e);
          }),
        e.data &&
          (e.cors ||
            (i.setRequestHeader &&
              i.setRequestHeader('X-Requested-With', 'XMLHttpRequest')),
          'application/json' === e.contentType
            ? i.setRequestHeader &&
              i.setRequestHeader(
                'Content-type',
                'application/json; charset=UTF-8',
              )
            : i.setRequestHeader &&
              i.setRequestHeader(
                'Content-type',
                'application/x-www-form-urlencoded',
              ));
    } catch (l) {
      pi.log(l);
    }
    i.send(e.data || null);
  }
  function N(e, t) {
    var r = [];
    return null == e
      ? r
      : Array.prototype.map && e.map === Array.prototype.map
      ? e.map(t)
      : (k(e, function (e, n, i) {
          r.push(t(e, n, i));
        }),
        r);
  }
  function O(e) {
    var t = [];
    try {
      t = N(atob(e).split(''), function (e) {
        return '%' + ('00' + e.charCodeAt(0).toString(16)).slice(-2);
      });
    } catch (r) {
      t = [];
    }
    try {
      return decodeURIComponent(t.join(''));
    } catch (r) {
      return t.join('');
    }
  }
  function j(e) {
    var t = '';
    try {
      t = btoa(
        encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, function (e, t) {
          return String.fromCharCode('0x' + t);
        }),
      );
    } catch (r) {
      t = e;
    }
    return t;
  }
  function T(e, t) {
    t = t || window;
    var r = !1,
      n = !0,
      i = t.document,
      a = i.documentElement,
      s = i.addEventListener,
      o = s ? 'addEventListener' : 'attachEvent',
      l = s ? 'removeEventListener' : 'detachEvent',
      u = s ? '' : 'on',
      c = function (n) {
        ('readystatechange' == n.type && 'complete' != i.readyState) ||
          (('load' == n.type ? t : i)[l](u + n.type, c, !1),
          !r && (r = !0) && e.call(t, n.type || n));
      },
      d = function () {
        try {
          a.doScroll('left');
        } catch (e) {
          return void setTimeout(d, 50);
        }
        c('poll');
      };
    if ('complete' == i.readyState) e.call(t, 'lazy');
    else {
      if (!s && a.doScroll) {
        try {
          n = !t.frameElement;
        } catch (p) {
          pi.log(p);
        }
        n && d();
      }
      i[o](u + 'DOMContentLoaded', c, !1),
        i[o](u + 'readystatechange', c, !1),
        t[o](u + 'load', c, !1);
    }
  }
  function I(e) {
    return (
      k(Array.prototype.slice.call(arguments, 1), function (t) {
        for (var r in t) void 0 !== t[r] && void 0 === e[r] && (e[r] = t[r]);
      }),
      e
    );
  }
  function $(e) {
    var t = e;
    try {
      t = decodeURI(e);
    } catch (r) {
      t = e;
    }
    return t;
  }
  function A(e) {
    var t = 't6KJCZa5pDdQ9khoEM3Tj70fbP2eLSyc4BrsYugARqFIw1mzlGNVXOHiWvxUn8',
      r = t.length - 1,
      n = {},
      i = 0;
    for (i = 0; i < t.length; i++) n[t.charAt(i)] = t.charAt(r - i);
    var a = '';
    for (i = 0; i < e.length; i++)
      a += e.charAt(i) in n ? n[e.charAt(i)] : e.charAt(i);
    return a;
  }
  function D(e) {
    return '[object Date]' == Object.prototype.toString.call(e);
  }
  function x(e) {
    function t(e) {
      return e < 10 ? '0' + e : e;
    }
    return (
      e.getFullYear() +
      '-' +
      t(e.getMonth() + 1) +
      '-' +
      t(e.getDate()) +
      ' ' +
      t(e.getHours()) +
      ':' +
      t(e.getMinutes()) +
      ':' +
      t(e.getSeconds()) +
      '.' +
      t(e.getMilliseconds())
    );
  }
  function E(e) {
    return (
      k(e, function (t, n) {
        D(t) ? (e[n] = x(t)) : r(t) && (e[n] = E(t));
      }),
      e
    );
  }
  function L(e) {
    return (
      k(Array.prototype.slice.call(arguments, 1), function (t) {
        for (var n in t)
          void 0 !== t[n] &&
            (r(t[n]) && r(e[n]) ? P(e[n], t[n]) : (e[n] = t[n]));
      }),
      e
    );
  }
  function U(e, t, r) {
    var n = Object.prototype.hasOwnProperty;
    if (e.filter) return e.filter(t);
    for (var i = [], a = 0; a < e.length; a++)
      if (n.call(e, a)) {
        var s = e[a];
        t.call(r, s, a, e) && i.push(s);
      }
    return i;
  }
  function R(e) {
    try {
      return JSON.stringify(e, null, '  ');
    } catch (t) {
      return JSON.stringify(e);
    }
  }
  function H(e) {
    return 'string' == typeof e && e.match(/^[a-zA-Z0-9\u4e00-\u9fa5\-\.]+$/)
      ? e
      : '';
  }
  function B(e, t) {
    (e = e || location.hostname), (t = t || 'domain_test');
    var r = H(e),
      n = r.split('.');
    if (v(n) && n.length >= 2 && !/^(\d+\.)+\d+$/.test(r))
      for (var i = '.' + n.splice(n.length - 1, 1); n.length > 0; )
        if (
          ((i = '.' + n.splice(n.length - 1, 1) + i),
          (document.cookie = t + '=true; path=/; domain=' + i),
          document.cookie.indexOf(t + '=true') !== -1)
        ) {
          var a = new Date();
          return (
            a.setTime(a.getTime() - 1e3),
            (document.cookie =
              t +
              '=true; expires=' +
              a.toGMTString() +
              '; path=/; SameSite=Lax; domain=' +
              i),
            i
          );
        }
    return '';
  }
  function J(e) {
    function t(e, t) {
      e = p(e);
      var r;
      if ('body' === e) return document.getElementsByTagName('body')[0];
      if (0 === e.indexOf('#'))
        (e = e.slice(1)), (r = document.getElementById(e));
      else if (e.indexOf(':nth-of-type') > -1) {
        var n = e.split(':nth-of-type');
        if (!n[0] || !n[1]) return null;
        var i = n[0],
          a = n[1].match(/\(([0-9]+)\)/);
        if (!a || !a[1]) return null;
        var s = Number(a[1]);
        if (!(g(t) && t.children && t.children.length > 0)) return null;
        for (var o = t.children, l = 0; l < o.length; l++)
          if (g(o[l])) {
            var u = o[l].tagName.toLowerCase();
            if (u === i && (s--, 0 === s)) {
              r = o[l];
              break;
            }
          }
        if (s > 0) return null;
      }
      return r ? r : null;
    }
    function r(e) {
      var i,
        a = n.shift();
      if (!a) return e;
      try {
        i = t(a, e);
      } catch (s) {
        pi.log(s);
      }
      return i && g(i) ? r(i) : null;
    }
    if (!d(e)) return null;
    var n = e.split('>'),
      i = null;
    return (i = r()), i && g(i) ? i : null;
  }
  function M(e, t) {
    var r = '',
      n = '';
    return (
      e.textContent
        ? (r = p(e.textContent))
        : e.innerText && (r = p(e.innerText)),
      r &&
        (r = r
          .replace(/[\r\n]/g, ' ')
          .replace(/[ ]+/g, ' ')
          .substring(0, 255)),
      (n = r || ''),
      ('input' !== t && 'INPUT' !== t) || (n = e.value || ''),
      n
    );
  }
  function q(e, t) {
    (t && 'string' == typeof t) || (t = 'hostname\u89e3\u6790\u5f02\u5e38');
    var r = null;
    try {
      r = _(e).hostname;
    } catch (n) {
      pi.log(
        'getHostname\u4f20\u5165\u7684url\u53c2\u6570\u4e0d\u5408\u6cd5\uff01',
      );
    }
    return r || t;
  }
  function K() {
    try {
      var e = navigator.appVersion.match(/OS (\d+)[._](\d+)[._]?(\d+)?/);
      return e && e[1] ? Number.parseInt(e[1], 10) : '';
    } catch (t) {
      return '';
    }
  }
  function V(e) {
    var t = {},
      r = e.split('?'),
      n = r[1] || '';
    return n && (t = c('?' + n)), t;
  }
  function F(e, t) {
    var r = _(e),
      n = r.searchParams.get(t) || '';
    if (!n) {
      var i = r.hash;
      if (i) {
        var a = V(i);
        n = a[t] || '';
      }
    }
    return n;
  }
  function z() {
    return (
      'undefined' != typeof window.matchMedia ||
      'undefined' != typeof window.msMatchMedia
    );
  }
  function W() {
    var e =
        screen.msOrientation ||
        screen.mozOrientation ||
        (screen.orientation || {}).type,
      t = '\u672a\u53d6\u5230\u503c';
    if (e) t = e.indexOf('landscape') > -1 ? 'landscape' : 'portrait';
    else if (z()) {
      var r = window.matchMedia || window.msMatchMedia;
      r('(orientation: landscape)').matches
        ? (t = 'landscape')
        : r('(orientation: portrait)').matches && (t = 'portrait');
    }
    return t;
  }
  function X() {
    var e,
      t = {},
      r = navigator.userAgent.toLowerCase();
    return (
      (e = r.match(/ qq\/([\d.]+)/))
        ? (t.qqBuildinBrowser = Number(e[1].split('.')[0]))
        : (e = r.match(/mqqbrowser\/([\d.]+)/))
        ? (t.qqBrowser = Number(e[1].split('.')[0]))
        : (e = r.match(/opera.([\d.]+)/))
        ? (t.opera = Number(e[1].split('.')[0]))
        : (e = r.match(/msie ([\d.]+)/))
        ? (t.ie = Number(e[1].split('.')[0]))
        : (e = r.match(/edge.([\d.]+)/))
        ? (t.edge = Number(e[1].split('.')[0]))
        : (e = r.match(/firefox\/([\d.]+)/))
        ? (t.firefox = Number(e[1].split('.')[0]))
        : (e = r.match(/chrome\/([\d.]+)/))
        ? (t.chrome = Number(e[1].split('.')[0]))
        : (e = r.match(/version\/([\d.]+).*safari/))
        ? (t.safari = Number(e[1].match(/^\d*.\d*/)))
        : (e = r.match(/trident\/([\d.]+)/)) && (t.ie = 11),
      t
    );
  }
  function Z(e) {
    return d(e) ? ((e = p(e)), $(e)) : $(location.href);
  }
  function G(e) {
    return d(e) ? ((e = p(e)), $(e)) : $(location.pathname);
  }
  function Q(e, t) {
    return e.hasAttribute
      ? e.hasAttribute(t)
      : e.attributes
      ? !(!e.attributes[t] || !e.attributes[t].specified)
      : void 0;
  }
  function Y(e, t) {
    if ('string' == typeof t) return Q(e, t);
    if (v(t)) {
      for (var r = !1, n = 0; n < t.length; n++) {
        var i = Q(e, t[n]);
        if (i) {
          r = !0;
          break;
        }
      }
      return r;
    }
  }
  function ee(e) {
    if ('string' != typeof e) return 0;
    var t = 0,
      r = null;
    if (0 == e.length) return t;
    for (var n = 0; n < e.length; n++)
      (r = e.charCodeAt(n)), (t = (t << 5) - t + r), (t &= t);
    return t;
  }
  function te(e) {
    var t = 9007199254740992,
      r = -9007199254740992,
      n = 31,
      i = 0;
    if (e.length > 0)
      for (var a = e.split(''), s = 0; s < a.length; s++) {
        var o = a[s].charCodeAt(),
          l = n * i + o;
        if (l > t) for (i = r + i; (l = n * i + o), l < r; ) i = i / 2 + o;
        if (l < r) for (i = t + i; (l = n * i + o), l > t; ) i = i / 2 + o;
        i = n * i + o;
      }
    return i;
  }
  function re(e, t) {
    var r = e.indexOf;
    if (r) return r.call(e, t);
    for (var n = 0; n < e.length; n++) if (t === e[n]) return n;
    return -1;
  }
  function ne(e, t) {
    return (
      (e.prototype = new t()),
      (e.prototype.constructor = e),
      (e.superclass = t.prototype),
      e
    );
  }
  function ie(e) {
    return !(!e || !Si.call(e, 'callee'));
  }
  function ae(e) {
    return '[object Boolean]' == Object.prototype.toString.call(e);
  }
  function se(e) {
    if (r(e)) {
      for (var t in e)
        if (Object.prototype.hasOwnProperty.call(e, t)) return !1;
      return !0;
    }
    return !1;
  }
  function oe(e) {
    if ('string' != typeof e) return !1;
    var t = /^https?:\/\/.+/;
    return t.test(e) !== !1 || (pi.log('Invalid URL'), !1);
  }
  function le() {
    return !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
  }
  function ue(e) {
    try {
      JSON.parse(e);
    } catch (t) {
      return !1;
    }
    return !0;
  }
  function ce(e) {
    return (
      '[object Number]' == Object.prototype.toString.call(e) &&
      /[\d\.]+/.test(String(e))
    );
  }
  function de() {
    var e = !1;
    if (
      'object' != typeof navigator ||
      'function' != typeof navigator.sendBeacon
    )
      return e;
    var t = X(),
      r = navigator.userAgent.toLowerCase();
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)
    ) {
      var n = /os [\d._]*/gi,
        i = r.match(n),
        a = (i + '').replace(/[^0-9|_.]/gi, '').replace(/_/gi, '.'),
        s = a.split('.');
      'undefined' == typeof t.safari && (t.safari = s[0]),
        s[0] && (t.qqBuildinBrowser || t.qqBrowser)
          ? (e = !1)
          : s[0] && s[0] < 13
          ? (t.chrome > 41 ||
              t.firefox > 30 ||
              t.opera > 25 ||
              t.safari > 12) &&
            (e = !0)
          : (t.chrome > 41 ||
              t.firefox > 30 ||
              t.opera > 25 ||
              t.safari > 11.3) &&
            (e = !0);
    } else (t.chrome > 38 || t.edge > 13 || t.firefox > 30 || t.opera > 25 || t.safari > 11) && (e = !0);
    return e;
  }
  function pe() {
    return (
      'undefined' != typeof window.XMLHttpRequest &&
      ('withCredentials' in new XMLHttpRequest() ||
        'undefined' != typeof XDomainRequest)
    );
  }
  function fe(t) {
    if (!r(t) || !d(t.callbackName))
      return pi.log('JSONP \u8bf7\u6c42\u7f3a\u5c11 callbackName'), !1;
    (t.success = e(t.success) ? t.success : function () {}),
      (t.error = e(t.error) ? t.error : function () {}),
      (t.data = t.data || '');
    var n = document.createElement('script'),
      i = document.getElementsByTagName('head')[0],
      a = null,
      s = !1;
    if (
      (i.appendChild(n),
      ce(t.timeout) &&
        (a = setTimeout(function () {
          return (
            !s &&
            (t.error('timeout'),
            (window[t.callbackName] = function () {
              pi.log('call jsonp error');
            }),
            (a = null),
            i.removeChild(n),
            void (s = !0))
          );
        }, t.timeout)),
      (window[t.callbackName] = function () {
        clearTimeout(a),
          (a = null),
          t.success.apply(null, arguments),
          (window[t.callbackName] = function () {
            pi.log('call jsonp error');
          }),
          i.removeChild(n);
      }),
      t.url.indexOf('?') > -1
        ? (t.url += '&callbackName=' + t.callbackName)
        : (t.url += '?callbackName=' + t.callbackName),
      r(t.data))
    ) {
      var o = [];
      k(t.data, function (e, t) {
        o.push(t + '=' + e);
      }),
        (t.data = o.join('&')),
        (t.url += '&' + t.data);
    }
    (n.onerror = function (e) {
      return (
        !s &&
        ((window[t.callbackName] = function () {
          pi.log('call jsonp error');
        }),
        clearTimeout(a),
        (a = null),
        i.removeChild(n),
        t.error(e),
        void (s = !0))
      );
    }),
      (n.src = t.url);
  }
  function _e(t) {
    var r = {
      visibleHandler: e(t.visible) ? t.visible : function () {},
      hiddenHandler: e(t.hidden) ? t.hidden : function () {},
      visibilityChange: null,
      hidden: null,
      isSupport: function () {
        return 'undefined' != typeof document[this.hidden];
      },
      init: function () {
        'undefined' != typeof document.hidden
          ? ((this.hidden = 'hidden'),
            (this.visibilityChange = 'visibilitychange'))
          : 'undefined' != typeof document.mozHidden
          ? ((this.hidden = 'mozHidden'),
            (this.visibilityChange = 'mozvisibilitychange'))
          : 'undefined' != typeof document.msHidden
          ? ((this.hidden = 'msHidden'),
            (this.visibilityChange = 'msvisibilitychange'))
          : 'undefined' != typeof document.webkitHidden &&
            ((this.hidden = 'webkitHidden'),
            (this.visibilityChange = 'webkitvisibilitychange')),
          this.listen();
      },
      listen: function () {
        if (this.isSupport()) {
          var e = this;
          b(
            document,
            this.visibilityChange,
            function () {
              document[e.hidden] ? e.hiddenHandler() : e.visibleHandler();
            },
            1,
          );
        } else
          b(window, 'focus', this.visibleHandler),
            b(window, 'blur', this.hiddenHandler);
      },
    };
    r.init();
  }
  function ge(e) {
    e = P(
      {
        success: function () {},
        error: function () {},
        appendCall: function (e) {
          document.getElementsByTagName('head')[0].appendChild(e);
        },
      },
      e,
    );
    var t = null;
    'css' === e.type &&
      ((t = document.createElement('link')),
      (t.rel = 'stylesheet'),
      (t.href = e.url)),
      'js' === e.type &&
        ((t = document.createElement('script')),
        (t.async = 'async'),
        t.setAttribute('charset', 'UTF-8'),
        (t.src = e.url),
        (t.type = 'text/javascript')),
      (t.onload = t.onreadystatechange =
        function () {
          (this.readyState &&
            'loaded' !== this.readyState &&
            'complete' !== this.readyState) ||
            (e.success(), (t.onload = t.onreadystatechange = null));
        }),
      (t.onerror = function () {
        e.error(), (t.onerror = null);
      }),
      e.appendCall(t);
  }
  function he(e) {
    if ('string' != typeof e) return '';
    for (var t = /^\s*javascript/i; t.test(e); ) e = e.replace(t, '');
    return e;
  }
  function me(e, t) {
    (e = String(e)), (t = 'number' == typeof t ? t : 13);
    for (var r = 126, n = e.split(''), i = 0, a = n.length; i < a; i++) {
      var s = n[i].charCodeAt(0);
      s < r && (n[i] = String.fromCharCode((n[i].charCodeAt(0) + t) % r));
    }
    return n.join('');
  }
  function ve(e) {
    var t = 13,
      r = 126;
    return (e = String(e)), me(e, r - t);
  }
  function ye(e) {
    (r(e) || v(e)) &&
      k(e, function (t, n) {
        r(t) || v(t) ? ye(e[n]) : D(t) && (e[n] = x(t));
      });
  }
  function be(e) {
    var t = document.createElement('style');
    t.type = 'text/css';
    try {
      t.appendChild(document.createTextNode(e));
    } catch (r) {
      t.styleSheet.cssText = e;
    }
    var n = document.getElementsByTagName('head')[0],
      i = document.getElementsByTagName('script')[0];
    n
      ? n.children.length
        ? n.insertBefore(t, n.children[0])
        : n.appendChild(t)
      : i.parentNode.insertBefore(t, i);
  }
  function we(e) {
    if ('string' != typeof e)
      return pi.log('\u8f6c\u6362unicode\u9519\u8bef', e), e;
    for (var t = '', r = 0; r < e.length; r++)
      t += '\\' + e.charCodeAt(r).toString(16);
    return t;
  }
  function Se(e, r, n) {
    var i,
      a,
      s,
      o = null,
      l = 0;
    n || (n = {});
    var u = function () {
      (l = n.leading === !1 ? 0 : t()),
        (o = null),
        (s = e.apply(i, a)),
        o || (i = a = null);
    };
    return function () {
      var c = t();
      l || n.leading !== !1 || (l = c);
      var d = r - (c - l);
      return (
        (i = this),
        (a = arguments),
        d <= 0 || d > r
          ? (o && (clearTimeout(o), (o = null)),
            (l = c),
            (s = e.apply(i, a)),
            o || (i = a = null))
          : o || n.trailing === !1 || (o = setTimeout(u, d)),
        s
      );
    };
  }
  function ke(e) {
    var t = [];
    return null == e
      ? t
      : (k(e, function (e) {
          t[t.length] = e;
        }),
        t);
  }
  function Pe(e) {
    return e
      ? e.toArray
        ? e.toArray()
        : v(e) || ie(e)
        ? Array.prototype.slice.call(e)
        : ke(e)
      : [];
  }
  function Ce(e) {
    for (var t, r = [], n = {}, i = 0; i < e.length; i++)
      (t = e[i]), t in n || ((n[t] = !0), r.push(t));
    return r;
  }
  function Ne() {
    if (
      ((ki.isSupport() &&
        'true' === sessionStorage.getItem('sensorsdata_jssdk_debug')) ||
        ji.show_log) &&
      (!r(arguments[0]) ||
        (ji.show_log !== !0 &&
          'string' !== ji.show_log &&
          ji.show_log !== !1) ||
        (arguments[0] = R(arguments[0])),
      'object' == typeof console && console.log)
    )
      try {
        return console.log.apply(console, arguments);
      } catch (e) {
        console.log(arguments[0]);
      }
  }
  function Oe() {
    if (ki.isSupport())
      try {
        sessionStorage.setItem('sensorsdata_jssdk_debug', 'true');
      } catch (e) {
        console.log('enableLocalLog error: ' + e.message);
      }
  }
  function je() {
    ki.isSupport() && sessionStorage.removeItem('sensorsdata_jssdk_debug');
  }
  function Te(e) {
    var t = ji.current_domain;
    switch (typeof t) {
      case 'function':
        var r = t();
        return '' === r || '' === p(r)
          ? 'url\u89e3\u6790\u5931\u8d25'
          : r.indexOf('.') !== -1
          ? r
          : 'url\u89e3\u6790\u5931\u8d25';
      case 'string':
        return '' === t || '' === p(t)
          ? 'url\u89e3\u6790\u5931\u8d25'
          : t.indexOf('.') !== -1
          ? t
          : 'url\u89e3\u6790\u5931\u8d25';
      default:
        var n = B(null, Ai);
        return '' === e
          ? 'url\u89e3\u6790\u5931\u8d25'
          : '' === n
          ? 'url\u89e3\u6790\u5931\u8d25'
          : n;
    }
  }
  function Ie() {
    var e = document.referrer,
      t = 'baidu.com';
    if (!e) return !1;
    try {
      var r = _(e).hostname;
      return r && r.substring(r.length - t.length) === t;
    } catch (n) {
      return !1;
    }
  }
  function $e() {
    var e = V(document.referrer);
    if (se(e) || !e.eqid) {
      var t = V(location.href);
      return e.ck || t.utm_source
        ? 'baidu_sem_keyword_id'
        : 'baidu_other_keyword_id';
    }
    return 'baidu_seo_keyword_id';
  }
  function Ae() {
    var e = V(document.referrer);
    return se(e) || !e.eqid ? gi().replace(/-/g, '') : e.eqid;
  }
  function De(e, t) {
    return (
      (e = e || document.referrer),
      d(e)
        ? ((e = p(e)),
          (e = $(e)),
          0 !== e.indexOf('https://www.baidu.com/') ||
            t ||
            (e = e.split('?')[0]),
          (e = e.slice(0, ji.max_referrer_string_length)),
          d(e) ? e : '')
        : '\u53d6\u503c\u5f02\u5e38_referrer\u5f02\u5e38_' + String(e)
    );
  }
  function xe(e) {
    return (
      (e = e || document.referrer), '' === e || B(q(e), Ai) !== B(null, Ai)
    );
  }
  function Ee(e, t) {
    e = e || document.referrer;
    var n = ji.source_type.keyword;
    if (document && d(e)) {
      if (0 === e.indexOf('http')) {
        var i = Le(e),
          a = V(e);
        if (se(a))
          return ji.preset_properties.search_keyword_baidu && Ie()
            ? void 0
            : '\u672a\u53d6\u5230\u503c';
        var s = null;
        for (var o in n)
          if (i === o && r(a))
            if (((s = n[o]), v(s)))
              for (o = 0; o < s.length; o++) {
                var l = a[s[o]];
                if (l) return t ? { active: l } : l;
              }
            else if (a[s]) return t ? { active: a[s] } : a[s];
        return ji.preset_properties.search_keyword_baidu && Ie()
          ? void 0
          : '\u672a\u53d6\u5230\u503c';
      }
      return '' === e
        ? '\u672a\u53d6\u5230\u503c_\u76f4\u63a5\u6253\u5f00'
        : '\u672a\u53d6\u5230\u503c_\u975ehttp\u7684url';
    }
    return '\u53d6\u503c\u5f02\u5e38_referrer\u5f02\u5e38_' + String(e);
  }
  function Le(e) {
    var t = q(e);
    if (!t || 'hostname\u89e3\u6790\u5f02\u5e38' === t) return '';
    var r = {
      baidu: [/^.*\.baidu\.com$/],
      bing: [/^.*\.bing\.com$/],
      google: [
        /^www\.google\.com$/,
        /^www\.google\.com\.[a-z]{2}$/,
        /^www\.google\.[a-z]{2}$/,
      ],
      sm: [/^m\.sm\.cn$/],
      so: [/^.+\.so\.com$/],
      sogou: [/^.*\.sogou\.com$/],
      yahoo: [/^.*\.yahoo\.com$/],
    };
    for (var n in r)
      for (var i = r[n], a = 0, s = i.length; a < s; a++)
        if (i[a].test(t)) return n;
    return '\u672a\u77e5\u641c\u7d22\u5f15\u64ce';
  }
  function Ue(e, t) {
    var r = '';
    if (((t = t || location.href), ji.cross_subdomain === !1)) {
      try {
        r = _(t).hostname;
      } catch (n) {
        Ne(n);
      }
      r =
        'string' == typeof r && '' !== r
          ? 'sajssdk_2015_' + ji.sdk_id + e + '_' + r.replace(/\./g, '_')
          : 'sajssdk_2015_root_' + ji.sdk_id + e;
    } else r = 'sajssdk_2015_cross_' + ji.sdk_id + e;
    return r;
  }
  function Re() {
    var e = 'new_user';
    return xi.isSupport()
      ? null !== xi.get('sensorsdata_is_new_user') || null !== xi.get(Ue(e))
      : null !== Ri.get(Ri.getNewUserFlagMemoryKey(e));
  }
  function He(e, t, n) {
    var i = !(!r(ji.heatmap) || !ji.heatmap.useCapture);
    return (
      r(ji.heatmap) && h(ji.heatmap.useCapture) && 'click' === t && (i = !0),
      b(e, t, n, i)
    );
  }
  function Be() {
    function e(e, t) {
      for (var r = 0; r < e.length; r++)
        if (t.split('?')[0].indexOf(e[r]) !== -1) return !0;
    }
    var t = '(' + ji.source_type.utm.join('|') + ')\\=[^&]+',
      r = ji.source_type.search,
      n = ji.source_type.social,
      i = document.referrer || '',
      a = Ui.pageProp.url;
    if (a) {
      var s = a.match(new RegExp(t));
      return s && s[0]
        ? '\u4ed8\u8d39\u5e7f\u544a\u6d41\u91cf'
        : e(r, i)
        ? '\u81ea\u7136\u641c\u7d22\u6d41\u91cf'
        : e(n, i)
        ? '\u793e\u4ea4\u7f51\u7ad9\u6d41\u91cf'
        : '' === i
        ? '\u76f4\u63a5\u6d41\u91cf'
        : '\u5f15\u8350\u6d41\u91cf';
    }
    return '\u83b7\u53d6url\u5f02\u5e38';
  }
  function Je(e) {
    var t = F(e, 'gdt_vid'),
      r = F(e, 'hash_key'),
      n = F(e, 'callbacks'),
      i = { click_id: '', hash_key: '', callbacks: '' };
    return (
      d(t) &&
        t.length &&
        ((i.click_id =
          16 == t.length || 18 == t.length
            ? t
            : '\u53c2\u6570\u89e3\u6790\u4e0d\u5408\u6cd5'),
        d(r) && r.length && (i.hash_key = r),
        d(n) && n.length && (i.callbacks = n)),
      i
    );
  }
  function Me(t) {
    var n = t.properties,
      i = JSON.parse(JSON.stringify(t));
    r(n) &&
      k(n, function (t, r) {
        if (e(t))
          try {
            (n[r] = t(i)),
              e(n[r]) &&
                (Ne(
                  '\u60a8\u7684\u5c5e\u6027- ' +
                    r +
                    ' \u683c\u5f0f\u4e0d\u6ee1\u8db3\u8981\u6c42\uff0c\u6211\u4eec\u5df2\u7ecf\u5c06\u5176\u5220\u9664',
                ),
                delete n[r]);
          } catch (a) {
            delete n[r],
              Ne(
                '\u60a8\u7684\u5c5e\u6027- ' +
                  r +
                  ' \u629b\u51fa\u4e86\u5f02\u5e38\uff0c\u6211\u4eec\u5df2\u7ecf\u5c06\u5176\u5220\u9664',
              );
          }
      });
  }
  function qe(e) {
    if (r(e) && e.$option) {
      var t = e.$option;
      return delete e.$option, t;
    }
    return {};
  }
  function Ke(e) {
    var t = {};
    return (
      k(e, function (e, r) {
        null != e && (t[r] = e);
      }),
      t
    );
  }
  function Ve(e) {
    var t = !e.type || 'profile' !== e.type.slice(0, 7),
      n = '\u53d6\u503c\u5f02\u5e38';
    r(e.properties) &&
      t &&
      ('$referrer' in e.properties &&
        (e.properties.$referrer_host =
          '' === e.properties.$referrer ? '' : q(e.properties.$referrer, n)),
      ji.preset_properties.latest_referrer &&
        ji.preset_properties.latest_referrer_host &&
        (e.properties.$latest_referrer_host =
          '' === e.properties.$latest_referrer
            ? ''
            : q(e.properties.$latest_referrer, n)));
  }
  function Fe(e) {
    var t = !e.type || 'profile' !== e.type.slice(0, 7),
      r = ji.preset_properties && t;
    r &&
      ji.preset_properties.url &&
      h(e.properties.$url) &&
      (e.properties.$url = Z()),
      r &&
        ji.preset_properties.title &&
        h(e.properties.$title) &&
        (e.properties.$title = document.title);
  }
  function ze(e) {
    if (!g(e.target)) return !1;
    var t = e.target,
      r = t.tagName.toLowerCase(),
      n = {};
    return (
      (n.$element_type = r),
      (n.$element_name = t.getAttribute('name')),
      (n.$element_id = t.getAttribute('id')),
      (n.$element_class_name = d(t.className) ? t.className : null),
      (n.$element_target_url = t.getAttribute('href')),
      (n.$element_content = Xe(t, r)),
      (n = Ke(n)),
      (n.$url = Z()),
      (n.$url_path = G()),
      (n.$title = document.title),
      n
    );
  }
  function We(t) {
    var r =
      ji.heatmap && e(ji.heatmap.collect_input) && ji.heatmap.collect_input(t);
    return 'button' === t.type || 'submit' === t.type || r ? t.value || '' : '';
  }
  function Xe(e, t) {
    return d(t) && 'input' === t.toLowerCase() ? We(e) : M(e, t);
  }
  function Ze(e) {
    return Li.protocol.ajax(e.url), C(e);
  }
  function Ge(e) {
    if (
      ('string' == typeof e &&
        ((e = p(e)),
        e &&
          ('://' === e.slice(0, 3)
            ? (e = location.protocol.slice(0, -1) + e)
            : '//' === e.slice(0, 2)
            ? (e = location.protocol + e)
            : 'http' !== e.slice(0, 4) && (e = ''))),
      v(e) && e.length)
    )
      for (var t = 0; t < e.length; t++)
        /sa\.gif[^\/]*$/.test(e[t]) ||
          (e[t] = e[t]
            .replace(/\/sa$/, '/sa.gif')
            .replace(/(\/sa)(\?[^\/]+)$/, '/sa.gif$2'));
    else
      /sa\.gif[^\/]*$/.test(e) ||
        'string' != typeof e ||
        (e = e
          .replace(/\/sa$/, '/sa.gif')
          .replace(/(\/sa)(\?[^\/]+)$/, '/sa.gif$2'));
    return e;
  }
  function Qe(e) {
    d(e) || (e = JSON.stringify(e));
    var t = j(e),
      r = 'crc=' + ee(t);
    return 'data=' + encodeURIComponent(t) + '&ext=' + encodeURIComponent(r);
  }
  function Ye() {
    (this.sendTimeStamp = 0),
      (this.timer = null),
      (this.serverUrl = ''),
      (this.hasTabStorage = !1);
  }
  function et(e, t) {
    for (var r in e)
      if (Object.prototype.hasOwnProperty.call(e, r) && !Gi.check(r, e[r], t))
        return !1;
    return !0;
  }
  function tt(t, n) {
    return r(t)
      ? (k(t, function (i, a) {
          if (v(i)) {
            var s = [];
            k(i, function (e) {
              if (d(e)) s.push(e);
              else if (h(e)) s.push('null');
              else
                try {
                  s.push(JSON.stringify(e));
                } catch (t) {
                  Ne(
                    '\u60a8\u7684\u6570\u636e-',
                    a,
                    i,
                    '\u6570\u7ec4\u91cc\u503c\u6709\u9519\u8bef,\u5df2\u5c06\u5176\u5220\u9664',
                  );
                }
            }),
              (t[a] = s);
          }
          var o = re(n || [], a) > -1;
          if (r(i) && '$option' !== a && !o)
            try {
              t[a] = JSON.stringify(i);
            } catch (l) {
              delete t[a],
                Ne(
                  '\u60a8\u7684\u6570\u636e-',
                  a,
                  i,
                  '\u6570\u636e\u503c\u6709\u9519\u8bef\uff0c\u5df2\u5c06\u5176\u5220\u9664',
                );
            }
          else
            d(i) ||
              ce(i) ||
              D(i) ||
              ae(i) ||
              v(i) ||
              e(i) ||
              '$option' === a ||
              o ||
              (Ne(
                '\u60a8\u7684\u6570\u636e-',
                a,
                i,
                '-\u683c\u5f0f\u4e0d\u6ee1\u8db3\u8981\u6c42\uff0c\u6211\u4eec\u5df2\u7ecf\u5c06\u5176\u5220\u9664',
              ),
              delete t[a]);
        }),
        t)
      : t;
  }
  function rt(e, t) {
    return ce(t) && e.length > t
      ? (Ne(
          '\u5b57\u7b26\u4e32\u957f\u5ea6\u8d85\u8fc7\u9650\u5236\uff0c\u5df2\u7ecf\u505a\u622a\u53d6--' +
            e,
        ),
        e.slice(0, t))
      : e;
  }
  function nt(e, t) {
    var n = [
      'distinct_id',
      'user_id',
      'id',
      'date',
      'datetime',
      'event',
      'events',
      'first_id',
      'original_id',
      'device_id',
      'properties',
      'second_id',
      'time',
      'users',
    ];
    r(e) &&
      k(n, function (r, n) {
        r in e &&
          (re(t || [], r) > -1 ||
            (n < 3
              ? (delete e[r],
                Ne(
                  '\u60a8\u7684\u5c5e\u6027- ' +
                    r +
                    '\u662f\u4fdd\u7559\u5b57\u6bb5\uff0c\u6211\u4eec\u5df2\u7ecf\u5c06\u5176\u5220\u9664',
                ))
              : Ne(
                  '\u60a8\u7684\u5c5e\u6027- ' +
                    r +
                    '\u662f\u4fdd\u7559\u5b57\u6bb5\uff0c\u8bf7\u907f\u514d\u5176\u4f5c\u4e3a\u5c5e\u6027\u540d',
                )));
      });
  }
  function it(e) {
    var t = ['$element_selector', '$element_path'],
      n = ['sensorsdata_app_visual_properties'];
    r(e) &&
      k(e, function (i, a) {
        if (r(i)) it(e[a]);
        else if (d(i)) {
          if (re(n, a) > -1) return;
          e[a] = rt(i, re(t, a) > -1 ? 1024 : ji.max_string_length);
        }
      });
  }
  function at(e) {
    'undefined' != typeof e.properties.$project &&
      ((e.project = e.properties.$project), delete e.properties.$project),
      'undefined' != typeof e.properties.$token &&
        ((e.token = e.properties.$token), delete e.properties.$token);
  }
  function st(e) {
    if ('item_type' in e) {
      var t = e.item_type,
        r = function (t) {
          return t || delete e.item_type, !0;
        };
      et({ item_type: t }, r);
    }
    if ('item_id' in e) {
      var n = e.item_id,
        i = function (t, r, n) {
          return t || 'string' !== n || delete e.item_id, !0;
        };
      et({ item_id: n }, i);
    }
  }
  function ot(e, t) {
    k(e, function (r, n) {
      var i = function (t, r, i) {
        return t || 'keyLength' === i || delete e[n], !0;
      };
      re(t || [], n) === -1 && et({ propertyKey: n }, i);
    });
  }
  function lt(e) {
    var t = e.properties;
    ye(e),
      r(t)
        ? (tt(t), nt(t), at(e), ot(t), it(t))
        : 'properties' in e && (e.properties = {}),
      st(e);
  }
  function ut(e, t) {
    var r = t.sensors;
    return (
      (e._track_id = Number(
        String(n()).slice(2, 5) +
          String(n()).slice(2, 4) +
          String(new Date().getTime()).slice(-4),
      )),
      (e._flush_time = new Date().getTime()),
      r.events.tempAdd('send', e),
      e
    );
  }
  function ct(e, t) {
    var n = t.sensors,
      i = {};
    r(e) && r(e.identities) && !se(e.identities)
      ? P(i, e.identities)
      : P(i, Wi._state.identities);
    var a = {
      identities: i,
      distinct_id: Wi.getDistinctId(),
      lib: {
        $lib: 'js',
        $lib_method: 'code',
        $lib_version: String(n.lib_version),
      },
      properties: {},
    };
    return (
      r(e) &&
        r(e.properties) &&
        !se(e.properties) &&
        (e.properties.$lib_detail &&
          ((a.lib.$lib_detail = e.properties.$lib_detail),
          delete e.properties.$lib_detail),
        e.properties.$lib_method &&
          ((a.lib.$lib_method = e.properties.$lib_method),
          delete e.properties.$lib_method)),
      L(a, Wi.getUnionId(), e),
      r(e.properties) && !se(e.properties) && P(a.properties, e.properties),
      (e.type && 'profile' === e.type.slice(0, 7)) ||
        ((a.properties = P(
          {},
          Ui.properties(),
          Wi.getProps(),
          Wi.getSessionProps(),
          Ui.currentProps,
          a.properties,
        )),
        n.para.preset_properties.latest_referrer &&
          !d(a.properties.$latest_referrer) &&
          (a.properties.$latest_referrer = '\u53d6\u503c\u5f02\u5e38'),
        n.para.preset_properties.latest_search_keyword &&
          !d(a.properties.$latest_search_keyword) &&
          ((n.para.preset_properties.search_keyword_baidu &&
            d(a.properties.$search_keyword_id) &&
            ce(a.properties.$search_keyword_id_hash) &&
            d(a.properties.$search_keyword_id_type)) ||
            (a.properties.$latest_search_keyword = '\u53d6\u503c\u5f02\u5e38')),
        n.para.preset_properties.latest_traffic_source_type &&
          !d(a.properties.$latest_traffic_source_type) &&
          (a.properties.$latest_traffic_source_type =
            '\u53d6\u503c\u5f02\u5e38'),
        n.para.preset_properties.latest_landing_page &&
          !d(a.properties.$latest_landing_page) &&
          (a.properties.$latest_landing_page = '\u53d6\u503c\u5f02\u5e38'),
        'not_collect' === n.para.preset_properties.latest_wx_ad_click_id
          ? (delete a.properties._latest_wx_ad_click_id,
            delete a.properties._latest_wx_ad_hash_key,
            delete a.properties._latest_wx_ad_callbacks)
          : n.para.preset_properties.latest_wx_ad_click_id &&
            !d(a.properties._latest_wx_ad_click_id) &&
            ((a.properties._latest_wx_ad_click_id = '\u53d6\u503c\u5f02\u5e38'),
            (a.properties._latest_wx_ad_hash_key = '\u53d6\u503c\u5f02\u5e38'),
            (a.properties._latest_wx_ad_callbacks =
              '\u53d6\u503c\u5f02\u5e38')),
        d(a.properties._latest_wx_ad_click_id) && (a.properties.$url = Z())),
      a.properties.$time && D(a.properties.$time)
        ? ((a.time = 1 * a.properties.$time), delete a.properties.$time)
        : (a.time = 1 * new Date()),
      (function (e) {
        if (n.bridge && 'success' === n.bridge.bridge_info.verify_success) {
          var t = ea.customProp.geth5Props(JSON.parse(JSON.stringify(e)));
          r(t) && !se(t) && (e.properties = P(e.properties, t));
        }
        var i = na.customProp.getVtrackProps(JSON.parse(JSON.stringify(e)));
        r(i) && !se(i) && (e.properties = P(e.properties, i));
      })(a),
      Me(a),
      Hi.checkIsAddSign(a),
      Hi.checkIsFirstTime(a),
      Ve(a),
      Fe(a),
      a
    );
  }
  function dt(e) {
    return aa.stage.process('basicProps', e);
  }
  function pt(e) {
    return aa.stage.process('formatData', e);
  }
  function ft(e, t, r, n) {
    function i(e) {
      function i() {
        s || ((s = !0), (location.href = a.href));
      }
      e.stopPropagation(), e.preventDefault();
      var s = !1;
      setTimeout(i, 1e3), n(t, r, i);
    }
    e = e || {};
    var a = null;
    return (
      e.ele && (a = e.ele),
      e.event && (a = e.target ? e.target : e.event.target),
      (r = r || {}),
      !(!a || 'object' != typeof a) &&
        (!a.href ||
        /^javascript/.test(a.href) ||
        a.target ||
        a.download ||
        a.onclick
          ? (n(t, r), !1)
          : (e.event && i(e.event),
            void (
              e.ele &&
              He(e.ele, 'click', function (e) {
                i(e);
              })
            )))
    );
  }
  function _t() {
    var e = location.protocol;
    return 'http:' === e || 'https:' === e ? e : 'http:';
  }
  function gt(e) {
    return oa.stage.process('webClickEvent', e);
  }
  function ht(e) {
    return oa.stage.process('webStayEvent', e);
  }
  function mt() {
    var e = Ui.campaignParams(),
      t = {};
    return (
      k(e, function (e, r, n) {
        (' ' + ci.source_channel_standard + ' ').indexOf(' ' + r + ' ') !== -1
          ? (t['$' + r] = n[r])
          : (t[r] = n[r]);
      }),
      t
    );
  }
  function vt(e, t, r) {
    if (ci.is_first_visitor && r) {
      var n = {};
      ci.para.preset_properties.search_keyword_baidu &&
        xe(document.referrer) &&
        Ie() &&
        ((n.$search_keyword_id = Ei.id()),
        (n.$search_keyword_id_type = Ei.type()),
        (n.$search_keyword_id_hash = te(n.$search_keyword_id)));
      var i = De(null, t);
      e(
        P(
          {
            $first_visit_time: new Date(),
            $first_referrer: i,
            $first_referrer_host: i ? q(i, '\u53d6\u503c\u5f02\u5e38') : '',
            $first_browser_language: d(navigator.language)
              ? navigator.language.toLowerCase()
              : '\u53d6\u503c\u5f02\u5e38',
            $first_browser_charset: d(document.charset)
              ? document.charset.toUpperCase()
              : '\u53d6\u503c\u5f02\u5e38',
            $first_traffic_source_type: Be(),
            $first_search_keyword: Ee(),
          },
          mt(),
          n,
        ),
      ),
        (ci.is_first_visitor = !1);
    }
  }
  function yt(t) {
    var r = location.href,
      n = window.history.pushState,
      i = window.history.replaceState;
    e(window.history.pushState) &&
      (window.history.pushState = function () {
        n.apply(window.history, arguments), t(r), (r = location.href);
      }),
      e(window.history.replaceState) &&
        (window.history.replaceState = function () {
          i.apply(window.history, arguments), t(r), (r = location.href);
        });
    var a;
    (a = window.document.documentMode
      ? 'hashchange'
      : n
      ? 'popstate'
      : 'hashchange'),
      b(window, a, function () {
        t(r), (r = location.href);
      });
  }
  function bt(e, t) {
    var r = [];
    'string' == typeof e &&
      e in fa.EVENT_LIST &&
      ((r = fa.EVENT_LIST[e]), fa[r[0]].on(r[1], t));
  }
  function wt(e, t) {
    var n = e.id,
      i = e.callback,
      a = e.name,
      s = Wi.getFirstId(),
      o = Wi.getOriginDistinctId();
    if (!et({ distinct_id: n })) return Ne('login id is invalid'), !1;
    if (n === Wi.getOriginDistinctId() && !s)
      return Ne('login id is equal to distinct_id'), !1;
    if (
      r(Wi._state.identities) &&
      Wi._state.identities.hasOwnProperty(a) &&
      n === Wi._state.first_id
    )
      return !1;
    var l =
      Wi._state.history_login_id.name !== a ||
      n !== Wi._state.history_login_id.value;
    if (l) {
      (Wi._state.identities[a] = n),
        Wi.set('history_login_id', { name: a, value: n }),
        s || Wi.set('first_id', o),
        t(n, '$SignUp', {}, i);
      var u = { $identity_cookie_id: Wi._state.identities.$identity_cookie_id };
      return (u[a] = n), St(u), !0;
    }
    return !1;
  }
  function St(e) {
    var t = {};
    for (var r in e) t[r] = e[r];
    (Wi._state.identities = t), Wi.save();
  }
  function kt(e, t) {
    if (!et({ unbindKey: e, bindValue: t })) return !1;
    if (
      r(Wi._state.identities) &&
      Wi._state.identities.hasOwnProperty(e) &&
      Wi._state.identities[e] === t
    ) {
      var n = Wi.getUnionId().login_id;
      n &&
        e + '+' + t === n &&
        ((Wi._state.distinct_id = Wi._state.first_id),
        (Wi._state.first_id = ''),
        Wi.set('history_login_id', { name: '', value: '' })),
        '$identity_cookie_id' !== e &&
          (delete Wi._state.identities[e], Wi.save());
    }
    var i = {};
    return (i[e] = t), i;
  }
  function Pt() {
    (ci._t = ci._t || 1 * new Date()),
      (ci.is_first_visitor = !1),
      (ci.source_channel_standard = Ii);
  }
  function Ct(e) {
    P(ji, e || ci.para || {}), (ci.para = ji);
    var t = {};
    if (r(ci.para.is_track_latest))
      for (var n in ci.para.is_track_latest)
        t['latest_' + n] = ci.para.is_track_latest[n];
    ci.para.preset_properties = P(
      {},
      Ti.preset_properties,
      t,
      ci.para.preset_properties || {},
    );
    var i;
    for (i in Ti) void 0 === ci.para[i] && (ci.para[i] = Ti[i]);
    'string' != typeof ci.para.web_url ||
      ('://' !== ci.para.web_url.slice(0, 3) &&
        '//' !== ci.para.web_url.slice(0, 2)) ||
      ('://' === ci.para.web_url.slice(0, 3)
        ? (ci.para.web_url = location.protocol.slice(0, -1) + ci.para.web_url)
        : (ci.para.web_url = location.protocol + ci.para.web_url)),
      Li.protocol.serverUrl(),
      ci.bridge && ci.bridge.initPara();
    var a = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
      ],
      s = [
        'www.baidu.',
        'm.baidu.',
        'm.sm.cn',
        'so.com',
        'sogou.com',
        'youdao.com',
        'google.',
        'yahoo.com/',
        'bing.com/',
        'ask.com/',
      ],
      o = [
        'weibo.com',
        'renren.com',
        'kaixin001.com',
        'douban.com',
        'qzone.qq.com',
        'zhihu.com',
        'tieba.baidu.com',
        'weixin.qq.com',
      ],
      l = {
        baidu: ['wd', 'word', 'kw', 'keyword'],
        google: 'q',
        bing: 'q',
        yahoo: 'p',
        sogou: ['query', 'keyword'],
        so: 'q',
        sm: 'q',
      };
    'object' == typeof ci.para.source_type &&
      ((ci.para.source_type.utm = v(ci.para.source_type.utm)
        ? ci.para.source_type.utm.concat(a)
        : a),
      (ci.para.source_type.search = v(ci.para.source_type.search)
        ? ci.para.source_type.search.concat(s)
        : s),
      (ci.para.source_type.social = v(ci.para.source_type.social)
        ? ci.para.source_type.social.concat(o)
        : o),
      (ci.para.source_type.keyword = r(ci.para.source_type.keyword)
        ? P(l, ci.para.source_type.keyword)
        : l));
    var u = { div: !1 },
      c = [
        'mark',
        '/mark',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'abbr',
        'ins',
        'del',
        's',
        'sup',
      ];
    if (
      (ci.para.heatmap && !r(ci.para.heatmap) && (ci.para.heatmap = {}),
      r(ci.para.heatmap))
    ) {
      (ci.para.heatmap.clickmap = ci.para.heatmap.clickmap || 'default'),
        (ci.para.heatmap.scroll_notice_map =
          ci.para.heatmap.scroll_notice_map || 'default'),
        (ci.para.heatmap.scroll_delay_time =
          ci.para.heatmap.scroll_delay_time || 4e3),
        (ci.para.heatmap.scroll_event_duration =
          ci.para.heatmap.scroll_event_duration || 18e3),
        (ci.para.heatmap.renderRefreshTime =
          ci.para.heatmap.renderRefreshTime || 1e3),
        (ci.para.heatmap.loadTimeout = ci.para.heatmap.loadTimeout || 1e3),
        ci.para.heatmap.get_vtrack_config !== !0 &&
          (ci.para.heatmap.get_vtrack_config = !1);
      var d = v(ci.para.heatmap.track_attr)
        ? U(ci.para.heatmap.track_attr, function (e) {
            return e && 'string' == typeof e;
          })
        : [];
      if (
        (d.push('data-sensors-click'),
        (ci.para.heatmap.track_attr = d),
        r(ci.para.heatmap.collect_tags))
      )
        if (ci.para.heatmap.collect_tags.div === !0)
          ci.para.heatmap.collect_tags.div = { ignore_tags: c, max_level: 1 };
        else if (r(ci.para.heatmap.collect_tags.div)) {
          if (
            (ci.para.heatmap.collect_tags.div.ignore_tags
              ? v(ci.para.heatmap.collect_tags.div.ignore_tags) ||
                (ci.log(
                  'ignore_tags \u53c2\u6570\u5fc5\u987b\u662f\u6570\u7ec4\u683c\u5f0f',
                ),
                (ci.para.heatmap.collect_tags.div.ignore_tags = c))
              : (ci.para.heatmap.collect_tags.div.ignore_tags = c),
            ci.para.heatmap.collect_tags.div.max_level)
          ) {
            var p = [1, 2, 3];
            re(p, ci.para.heatmap.collect_tags.div.max_level) === -1 &&
              (ci.para.heatmap.collect_tags.div.max_level = 1);
          }
        } else ci.para.heatmap.collect_tags.div = !1;
      else ci.para.heatmap.collect_tags = u;
    }
    (ci.para.server_url = Ge(ci.para.server_url)),
      ci.para.noCache === !0
        ? (ci.para.noCache = '?' + new Date().getTime())
        : (ci.para.noCache = ''),
      ci.para.callback_timeout > ci.para.datasend_timeout &&
        (ci.para.datasend_timeout = ci.para.callback_timeout),
      ci.para.heatmap &&
        ci.para.heatmap.collect_tags &&
        r(ci.para.heatmap.collect_tags) &&
        k(ci.para.heatmap.collect_tags, function (e, t) {
          'div' !== t && e && ci.heatmap.otherTags.push(t);
        }),
      ci.para.heatmap &&
        'default' === ci.para.heatmap.clickmap &&
        ci.heatmap.initUnlimitedTags();
  }
  function Nt() {
    var e = Array.prototype.slice.call(arguments),
      t = e[0],
      r = e.slice(1);
    return 'string' == typeof t && ca[t]
      ? ca[t].apply(ca, r)
      : void ('function' == typeof t
          ? t.apply(ci, r)
          : ci.log(
              'quick\u65b9\u6cd5\u4e2d\u6ca1\u6709\u8fd9\u4e2a\u529f\u80fd' +
                e[0],
            ));
  }
  function Ot(t, n) {
    function i() {
      return (
        !s.plugin_is_init && s.init(ci, n),
        (s.plugin_is_init = !0),
        (ci.modules = ci.modules || {}),
        (ci.modules[s.plugin_name || 'unnamed_' + ga++] = s),
        s
      );
    }
    var a = ci.log || function () {};
    if (!d(t) && !r(t))
      return a("use's first arguments must be string or object."), !1;
    var s;
    if (r(t)) {
      var o = ci.modules && ci.modules[t.plugin_name];
      o &&
        o !== t &&
        a(
          t.plugin_name +
            ' plugin_name is conflict with loaded plugin, sdk uses loaded plugin.',
        ),
        (s = o || t);
    }
    return (
      d(t) &&
        (r(ci.modules) && r(ci.modules[t])
          ? (s = ci.modules[t])
          : r(window.SensorsDataWebJSSDKPlugin) &&
            r(window.SensorsDataWebJSSDKPlugin[t])
          ? (s = window.SensorsDataWebJSSDKPlugin[t])
          : window.sensorsDataAnalytic201505 &&
            window.sensorsDataAnalytic201505.modules[t] &&
            (s = window.sensorsDataAnalytic201505.modules[t])),
      s && e(s.init)
        ? s.plugin_is_init
          ? s
          : (s.plugin_name ||
              a('warning: invalid plugin, plugin_name required.'),
            s.plugin_version
              ? s.plugin_version !== ci.lib_version &&
                a(
                  'warning: plugin version not match SDK version. plugin may not work correctly. ',
                )
              : a('warning: invalid plugin, plugin version required.'),
            i())
        : (a(
            (t.plugin_name || t) +
              " is not found or it's not a standard plugin. Please check sensorsdata official documents.",
          ),
          s)
    );
  }
  function jt(e, t, r) {
    et({ event: e, properties: t }) &&
      sa.send({ type: 'track', event: e, properties: t }, r);
  }
  function Tt(e, t) {
    return (
      !!et({ bindKey: e, bindValue: t }) &&
      ((Wi._state.identities[e] = t),
      Wi.save(),
      void sa.send({ type: 'track_id_bind', event: '$BindID', properties: {} }))
    );
  }
  function It(e, t) {
    var r = kt(e, t);
    r &&
      sa.send({
        identities: r,
        type: 'track_id_unbind',
        event: '$UnbindID',
        properties: {},
      });
  }
  function $t(e, t, r) {
    'object' == typeof e && e.tagName
      ? ft({ ele: e }, t, r, ci.track)
      : 'object' == typeof e && e.target && e.event && ft(e, t, r, ci.track);
  }
  function At(e, t, r) {
    return (
      (r = r || {}),
      !(!e || 'object' != typeof e) &&
        !(!e.href || /^javascript/.test(e.href) || e.target) &&
        void He(e, 'click', function (n) {
          function i() {
            a || ((a = !0), (location.href = e.href));
          }
          n.preventDefault();
          var a = !1;
          setTimeout(i, 1e3), ci.track(t, r, i);
        })
    );
  }
  function Dt(e, t, r) {
    et({ item_type: e, item_id: t, properties: r }) &&
      sa.sendItem({
        type: 'item_set',
        item_type: e,
        item_id: t,
        properties: r || {},
      });
  }
  function xt(e, t) {
    et({ item_type: e, item_id: t }) &&
      sa.sendItem({ type: 'item_delete', item_type: e, item_id: t });
  }
  function Et(e, t) {
    et({ propertiesMust: e }) &&
      sa.send({ type: 'profile_set', properties: e }, t);
  }
  function Lt(e, t) {
    et({ propertiesMust: e }) &&
      sa.send({ type: 'profile_set_once', properties: e }, t);
  }
  function Ut(e, t) {
    et({ propertiesMust: e }) &&
      (k(e, function (t, r) {
        d(t)
          ? (e[r] = [t])
          : v(t)
          ? (e[r] = t)
          : (delete e[r],
            ci.log(
              'appendProfile\u5c5e\u6027\u7684\u503c\u5fc5\u987b\u662f\u5b57\u7b26\u4e32\u6216\u8005\u6570\u7ec4',
            ));
      }),
      se(e) || sa.send({ type: 'profile_append', properties: e }, t));
  }
  function Rt(e, t) {
    function r(e) {
      for (var t in e)
        if (
          Object.prototype.hasOwnProperty.call(e, t) &&
          !/-*\d+/.test(String(e[t]))
        )
          return !1;
      return !0;
    }
    var n = e;
    d(e) && ((e = {}), (e[n] = 1)),
      et({ propertiesMust: e }) &&
        (r(e)
          ? sa.send({ type: 'profile_increment', properties: e }, t)
          : ci.log(
              'profile_increment\u7684\u503c\u53ea\u80fd\u662f\u6570\u5b57',
            ));
  }
  function Ht(e) {
    sa.send({ type: 'profile_delete' }, e),
      Wi.set('distinct_id', gi()),
      Wi.set('first_id', '');
  }
  function Bt(e, t) {
    var r = e,
      n = {};
    d(e) && ((e = []), e.push(r)),
      v(e)
        ? (k(e, function (e) {
            d(e)
              ? (n[e] = !0)
              : ci.log(
                  'profile_unset\u7ed9\u7684\u6570\u7ec4\u91cc\u9762\u7684\u503c\u5fc5\u987b\u65f6string,\u5df2\u7ecf\u8fc7\u6ee4\u6389',
                  e,
                );
          }),
          sa.send({ type: 'profile_unset', properties: n }, t))
        : ci.log('profile_unset\u7684\u53c2\u6570\u662f\u6570\u7ec4');
  }
  function Jt(e, t) {
    'number' == typeof e && (e = String(e));
    var r = Wi.getFirstId();
    if ('undefined' == typeof e) {
      var n = gi();
      r ? Wi.set('first_id', n) : Wi.set('distinct_id', n);
    } else et({ distinct_id: e }) && (t === !0 ? (r ? Wi.set('first_id', e) : Wi.set('distinct_id', e)) : r ? Wi.change('first_id', e) : Wi.change('distinct_id', e));
  }
  function Mt(e, t, r, n) {
    var i = Wi.getFirstId() || Wi.getDistinctId();
    Wi.set('distinct_id', e),
      sa.send(
        {
          original_id: i,
          distinct_id: Wi.getDistinctId(),
          type: 'track_signup',
          event: t,
          properties: r,
        },
        n,
      );
  }
  function qt(e, t, r, n) {
    'number' == typeof e && (e = String(e)),
      et({ distinct_id: e, event: t, properties: r }) && Mt(e, t, r, n);
  }
  function Kt(e) {
    et({ properties: e })
      ? P(Ui.currentProps, e)
      : ci.log('register\u8f93\u5165\u7684\u53c2\u6570\u6709\u8bef');
  }
  function Vt(e) {
    Wi.clearAllProps(e);
  }
  function Ft(e) {
    var t;
    if (v(e) && e.length > 0)
      for (t = 0; t < e.length; t++)
        d(e[t]) && e[t] in Ui.currentProps && delete Ui.currentProps[e[t]];
    else if (e === !0) for (t in Ui.currentProps) delete Ui.currentProps[t];
  }
  function zt(e) {
    et({ properties: e })
      ? Wi.setProps(e)
      : ci.log('register\u8f93\u5165\u7684\u53c2\u6570\u6709\u8bef');
  }
  function Wt(e) {
    et({ properties: e })
      ? Wi.setPropsOnce(e)
      : ci.log('registerOnce\u8f93\u5165\u7684\u53c2\u6570\u6709\u8bef');
  }
  function Xt(e) {
    ci.log(
      'registerSession \u65b9\u6cd5\u5df2\u7ecf\u5f03\u7528\uff0c\u6709\u95ee\u9898\u8054\u7cfb\u6280\u672f\u987e\u95ee',
    ),
      et({ properties: e })
        ? Wi.setSessionProps(e)
        : ci.log('registerSession\u8f93\u5165\u7684\u53c2\u6570\u6709\u8bef');
  }
  function Zt(e) {
    ci.log(
      'registerSessionOnce \u65b9\u6cd5\u5df2\u7ecf\u5f03\u7528\uff0c\u6709\u95ee\u9898\u8054\u7cfb\u6280\u672f\u987e\u95ee',
    ),
      et({ properties: e })
        ? Wi.setSessionPropsOnce(e)
        : ci.log(
            'registerSessionOnce\u8f93\u5165\u7684\u53c2\u6570\u6709\u8bef',
          );
  }
  function Gt(t, r) {
    'number' == typeof t && (t = String(t));
    var n = wt({ id: t, callback: r, name: Di.LOGIN }, Mt);
    !n && e(r) && r();
  }
  function Qt(e, t) {
    return (
      'number' == typeof t && (t = String(t)),
      'number' == typeof e && (e = String(e)),
      !!et({ loginIdKey: e }) &&
        (Di.LOGIN === e
          ? (Gt(t), !1)
          : void wt({ id: t, callback: null, name: e }, Mt))
    );
  }
  function Yt(e) {
    var t = Wi.getFirstId();
    if (t)
      if ((Wi.set('first_id', ''), e === !0)) {
        var r = gi();
        Wi.set('distinct_id', r);
      } else Wi.set('distinct_id', t);
    St({ $identity_cookie_id: Wi._state.identities.$identity_cookie_id }),
      Wi.set('history_login_id', { name: '', value: '' });
  }
  function er() {
    function e() {
      var e = Ui.campaignParams(),
        t = {};
      return (
        k(e, function (e, r, n) {
          (' ' + ci.source_channel_standard + ' ').indexOf(' ' + r + ' ') !== -1
            ? (t['$' + r] = n[r])
            : (t[r] = n[r]);
        }),
        t
      );
    }
    var t = {
        $is_first_day: Re(),
        $is_first_time: Hi.is_page_first_visited,
        $referrer: Ui.pageProp.referrer || '',
        $referrer_host: Ui.pageProp.referrer ? q(Ui.pageProp.referrer) : '',
        $url: Z(),
        $url_path: G(),
        $title: document.title || '',
        _distinct_id: Wi.getDistinctId(),
        identities: JSON.parse(JSON.stringify(Wi._state.identities)),
      },
      r = P({}, Ui.properties(), Wi.getProps(), e(), t);
    return (
      ci.para.preset_properties.latest_referrer &&
        ci.para.preset_properties.latest_referrer_host &&
        (r.$latest_referrer_host =
          '' === r.$latest_referrer ? '' : q(r.$latest_referrer)),
      r
    );
  }
  function tr() {
    var e = '',
      t = ' { cursor: pointer; -webkit-tap-highlight-color: rgba(0,0,0,0); }';
    ci.heatmap &&
      v(ci.heatmap.otherTags) &&
      k(ci.heatmap.otherTags, function (r) {
        e += r + t;
      }),
      le() &&
        K() &&
        K() < 13 &&
        (ci.para.heatmap &&
          ci.para.heatmap.collect_tags &&
          ci.para.heatmap.collect_tags.div &&
          be('div, [data-sensors-click]' + t),
        ci.para.heatmap &&
          ci.para.heatmap.track_attr &&
          be('[' + ci.para.heatmap.track_attr.join('], [') + ']' + t),
        '' !== e && be(e));
  }
  function rr(e) {
    var t = this;
    (this.type = e),
      (this.resultCbs = {}),
      (this.timeoutCbs = {}),
      (this.timerId = null),
      (this.appCallJsCallback = null),
      window.sensorsdata_app_call_js ||
        (window.sensorsdata_app_call_js = function (e, t) {
          if (e in window.sensorsdata_app_call_js.modules)
            return window.sensorsdata_app_call_js.modules[e](t);
        }),
      (window.sensorsdata_app_call_js.modules =
        window.sensorsdata_app_call_js.modules || {}),
      (window.sensorsdata_app_call_js.modules[this.type] = function (e) {
        try {
          var r = O(e) || e;
          try {
            r = JSON.parse(r);
          } catch (n) {}
          var i = r && r.message_id;
          if (i && t.resultCbs[i]) {
            if (((e = r), t.timeoutCbs[i] && t.timeoutCbs[i].isTimeout))
              return void (t.resultCbs[i].callbacks.length = 0);
            if (t.resultCbs[i]) {
              (t.resultCbs[i].result = e),
                clearTimeout(t.timerId),
                (t.timeoutCbs[i].callbacks.length = 0);
              for (var a in t.resultCbs[i].callbacks)
                t.resultCbs[i].callbacks[a].call(null, e),
                  t.resultCbs[i].callbacks.splice(a, 1);
            }
            return;
          }
          return t.appCallJsCallback && t.appCallJsCallback.call(null, e);
        } catch (s) {
          console.log('app \u56de\u8c03 js \u5f02\u5e38', e);
        }
      });
  }
  function nr(t) {
    try {
      if (ci.bridge.activeBridge && e(ci.bridge.activeBridge.handleCommand))
        return ci.bridge.activeBridge.handleCommand(t);
    } catch (r) {
      ci.log('Error: handle command exception:' + r);
    }
    return (
      ci.log(
        '\u6570\u636e\u53d1\u5f80App\u5931\u8d25\uff0cApp\u6ca1\u6709\u66b4\u9732bridge,type:' +
          t.callType,
      ),
      !1
    );
  }
  function ir(e) {
    function t(e) {
      var t = { hostname: '', project: '' };
      try {
        (e = _(e)),
          (t.hostname = e.hostname),
          (t.project = e.searchParams.get('project') || 'default');
      } catch (r) {
        ci.log(r);
      }
      return t;
    }
    var r = t(e),
      n = t(ci.para.server_url);
    if (r.hostname === n.hostname && r.project === n.project) return !0;
    if (v(ci.para.app_js_bridge.white_list))
      for (var i = 0; i < ci.para.app_js_bridge.white_list.length; i++) {
        var a = t(ci.para.app_js_bridge.white_list[i]);
        if (a.hostname === r.hostname && a.project === r.project) return !0;
      }
    return !1;
  }
  function ar(e) {
    this.bridge = new rr(e.type);
  }
  function sr() {
    var e = Ui.pageProp.url_domain,
      t = {};
    '' === e && (e = 'url\u89e3\u6790\u5931\u8d25');
    var n = Ee(document.referrer, !0);
    if (
      (ji.preset_properties.search_keyword_baidu
        ? xe(document.referrer) &&
          (!Ie() || (r(n) && n.active)
            ? Wi._state &&
              Wi._state.props &&
              (Wi._state.props.$search_keyword_id &&
                delete Wi._state.props.$search_keyword_id,
              Wi._state.props.$search_keyword_id_type &&
                delete Wi._state.props.$search_keyword_id_type,
              Wi._state.props.$search_keyword_id_hash &&
                delete Wi._state.props.$search_keyword_id_hash)
            : ((t.$search_keyword_id = Ei.id()),
              (t.$search_keyword_id_type = Ei.type()),
              (t.$search_keyword_id_hash = te(t.$search_keyword_id))))
        : Wi._state &&
          Wi._state.props &&
          (Wi._state.props.$search_keyword_id &&
            delete Wi._state.props.$search_keyword_id,
          Wi._state.props.$search_keyword_id_type &&
            delete Wi._state.props.$search_keyword_id_type,
          Wi._state.props.$search_keyword_id_hash &&
            delete Wi._state.props.$search_keyword_id_hash),
      Wi.save(),
      k(ji.preset_properties, function (n, i) {
        if (i.indexOf('latest_') === -1) return !1;
        if (((i = i.slice(7)), n)) {
          if ('wx_ad_click_id' === i && 'not_collect' === n) return !1;
          if ('utm' !== i && 'url\u89e3\u6790\u5931\u8d25' === e)
            'wx_ad_click_id' === i
              ? ((t._latest_wx_ad_click_id =
                  'url\u7684domain\u89e3\u6790\u5931\u8d25'),
                (t._latest_wx_ad_hash_key =
                  'url\u7684domain\u89e3\u6790\u5931\u8d25'),
                (t._latest_wx_ad_callbacks =
                  'url\u7684domain\u89e3\u6790\u5931\u8d25'))
              : (t['$latest_' + i] = 'url\u7684domain\u89e3\u6790\u5931\u8d25');
          else if (xe(document.referrer))
            switch (i) {
              case 'traffic_source_type':
                t.$latest_traffic_source_type = Be();
                break;
              case 'referrer':
                t.$latest_referrer = Ui.pageProp.referrer;
                break;
              case 'search_keyword':
                Ee()
                  ? (t.$latest_search_keyword = Ee())
                  : r(Wi._state) &&
                    r(Wi._state.props) &&
                    Wi._state.props.$latest_search_keyword &&
                    delete Wi._state.props.$latest_search_keyword;
                break;
              case 'landing_page':
                t.$latest_landing_page = Z();
                break;
              case 'wx_ad_click_id':
                var a = Je(location.href);
                (t._latest_wx_ad_click_id = a.click_id),
                  (t._latest_wx_ad_hash_key = a.hash_key),
                  (t._latest_wx_ad_callbacks = a.callbacks);
            }
        } else if ('utm' === i && Wi._state && Wi._state.props)
          for (var s in Wi._state.props)
            (0 === s.indexOf('$latest_utm') ||
              (0 === s.indexOf('_latest_') &&
                s.indexOf('_latest_wx_ad_') < 0)) &&
              delete Wi._state.props[s];
        else if (
          Wi._state &&
          Wi._state.props &&
          '$latest_' + i in Wi._state.props
        )
          delete Wi._state.props['$latest_' + i];
        else if (
          'wx_ad_click_id' == i &&
          Wi._state &&
          Wi._state.props &&
          n === !1
        ) {
          var o = [
            '_latest_wx_ad_click_id',
            '_latest_wx_ad_hash_key',
            '_latest_wx_ad_callbacks',
          ];
          k(o, function (e) {
            e in Wi._state.props && delete Wi._state.props[e];
          });
        }
      }),
      ji.preset_properties.latest_utm)
    ) {
      var i = Ui.campaignParamsStandard('$latest_', '_latest_'),
        a = i.$utms,
        s = i.otherUtms;
      se(a) || P(t, a), se(s) || P(t, s);
    }
    zt(t);
  }
  function or(e) {
    var t = null;
    try {
      var r = JSON.parse(window.name);
      t = r[e] ? u(r[e]) : null;
    } catch (n) {
      t = null;
    }
    return null === t && (t = F(location.href, e) || null), t;
  }
  function lr(e) {
    function t() {
      var e = [];
      n.touch_app_bridge || e.push(Li.defineMode('1')),
        r(ci.para.app_js_bridge) ||
          (e.push(Li.defineMode('2')), (n.verify_success = !1)),
        (r(ci.para.heatmap) && 'default' == ci.para.heatmap.clickmap) ||
          e.push(Li.defineMode('3')),
        'fail' === n.verify_success && e.push(Li.defineMode('4')),
        new ci.SDKJSBridge('app_alert').notifyApp({ data: e });
    }
    var n = ci.bridge.bridge_info;
    if (ci.bridge.hasVisualModeBridge())
      if (r(ci.para.heatmap) && 'default' == ci.para.heatmap.clickmap)
        if (r(ci.para.app_js_bridge) && 'success' === n.verify_success)
          if (e) window.sa_jssdk_app_define_mode(ci, e);
          else {
            var i = location.protocol,
              a = ['http:', 'https:'];
            (i = re(a, i) > -1 ? i : 'https:'),
              ge({
                success: function () {
                  setTimeout(function () {
                    'undefined' != typeof sa_jssdk_app_define_mode &&
                      window.sa_jssdk_app_define_mode(ci, e);
                  }, 0);
                },
                error: function () {},
                type: 'js',
                url:
                  i +
                  '//static.sensorsdata.cn/sdk/' +
                  ci.lib_version +
                  '/vapph5define.min.js',
              });
          }
        else t();
      else t();
  }
  function ur(t) {
    ci.para.is_track_single_page &&
      da.on('switch', function (n) {
        var i = function (r) {
          if (((r = r || {}), n !== location.href)) {
            Ui.pageProp.referrer = Z(n);
            var i = P({ $url: Z(), $referrer: Z(n) }, r);
            e(t) ? t(i) : ci.quick && ci.quick('autoTrack', i);
          }
        };
        if ('boolean' == typeof ci.para.is_track_single_page) i();
        else if ('function' == typeof ci.para.is_track_single_page) {
          var a = ci.para.is_track_single_page();
          r(a) ? i(a) : a === !0 && i();
        }
      });
  }
  function cr() {
    ci._q &&
      v(ci._q) &&
      ci._q.length > 0 &&
      k(ci._q, function (e) {
        ci[e[0]].apply(ci, Array.prototype.slice.call(e[1]));
      }),
      r(ci.para.heatmap) && (ua.initHeatmap(), ua.initScrollmap());
  }
  function dr() {
    ci.readyState.setState(3),
      new ci.SDKJSBridge('visualized').onAppNotify(function () {
        lr('undefined' != typeof sa_jssdk_app_define_mode);
      }),
      lr(!1),
      ci.bridge.app_js_bridge_v1(),
      Ui.initPage(),
      ur(),
      Wi.init(),
      sr(),
      fr(),
      ci.readyState.setState(4),
      cr();
  }
  function pr() {
    ya.isSeachHasKeyword()
      ? ya.hasKeywordHandle()
      : window.parent !== self && ba.isSearchHasKeyword()
      ? ba.verifyVtrackMode()
      : ya.isWindowNameHasKeyword()
      ? ya.windowNameHasKeywordHandle()
      : ya.isStorageHasKeyword()
      ? ya.storageHasKeywordHandle()
      : window.parent !== self && ba.isStorageHasKeyword()
      ? ba.verifyVtrackMode()
      : (dr(), ba.notifyUser());
  }
  function fr() {
    na.init(), 'success' === ci.bridge.bridge_info.verify_success && ea.init();
  }
  function _r() {
    k(wa, function (t) {
      var r = ci[t];
      ci[t] = function () {
        if (ci.readyState.state < 3)
          return v(ci._q) || (ci._q = []), ci._q.push([t, arguments]), !1;
        if (!e(ci.getDisabled) || !ci.getDisabled()) {
          if (ci.readyState.getState()) return r.apply(ci, arguments);
          try {
            console.error('\u8bf7\u5148\u521d\u59cb\u5316\u795e\u7b56JS SDK');
          } catch (n) {
            ci.log(n);
          }
        }
      };
    });
  }
  function gr(e, t) {
    (this.cancel = function () {
      e = !0;
    }),
      (this.getCanceled = function () {
        return e || !1;
      }),
      (this.stop = function () {
        t = !0;
      }),
      (this.getStopped = function () {
        return t || !1;
      });
  }
  function hr(e, t, r) {
    var n = null;
    try {
      n = JSON.parse(JSON.stringify(e || null));
    } catch (i) {}
    (this.getOriginalData = function () {
      return n;
    }),
      (this.getPosition = function () {
        return t;
      }),
      (this.cancellationToken = new gr()),
      (this.sensors = r);
  }
  function mr(e) {
    if (!r(e)) throw 'error: Stage constructor requires arguments.';
    (this.processDef = e), (this.registeredInterceptors = {});
  }
  function vr(e) {
    e && e.buildDataStage && Pa.registerStageImplementation(e.buildDataStage),
      e && e.businessStage && ja.registerStageImplementation(e.businessStage),
      e && e.sendDataStage && Na.registerStageImplementation(e.sendDataStage),
      e && e.viewStage && Ia.registerStageImplementation(e.viewStage);
  }
  function yr(e, t) {
    $a[e] && $a[e](t);
  }
  function br() {
    return Aa.stage && Aa.stage.process('getUtmData');
  }
  function wr(e) {
    return Da.stage.process('send', e);
  }
  function Sr(e) {
    (e.kit = xa),
      (e.saEvent = sa),
      (this.buildDataStage = aa),
      (this.sendDataStage = Da),
      (this.businessStage = Aa);
  }
  function kr(e) {
    (e.heatmap = ua), (this.viewStage = oa);
  }
  function Pr(e) {
    e &&
      ((ci.events = zi),
      (ci.bridge = va),
      (ci.SDKJSBridge = rr),
      (ci.JSBridge = ar),
      (ci.store = Wi),
      (ci.unlimitedDiv = ta),
      (ci.customProp = ra),
      (ci.vtrackcollect = na),
      (ci.vapph5collect = ea),
      (ci.detectMode = pr),
      (ci.registerFeature = vr),
      (ci.registerInterceptor = yr),
      (ci.commonWays = ca),
      vr(new Sr(ci)),
      vr(new kr(ci)),
      yr('viewStage', Ea));
    var t = e ? ha : Sa;
    for (var r in t) ci[r] = t[r];
    (ci._ = ma),
      (ci.on = bt),
      (ci.ee = fa),
      (ci.use = Ot),
      (ci.lib_version = $i);
  }
  function Cr(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Nr(e, t, r) {
    return Cr(e, t, r), (e.plugin_version = rs), e;
  }
  function Or(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function jr(e, t, r) {
    return Or(e, t, r), (e.plugin_version = as), e;
  }
  function Tr(e) {
    return cs && cs.call(ls, JSON.stringify(e));
  }
  function Ir(e) {
    return us.call(ls) && ds && ds.call(ls, JSON.stringify(e));
  }
  function $r(e, t) {
    return t && 'function' == typeof t[e.callType] && t[e.callType]();
  }
  function Ar(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Dr(e, t, r) {
    return Ar(e, t, r), (e.plugin_version = fs), e;
  }
  function xr() {
    if (
      ((Ra = window.SensorsData_APP_New_H5_Bridge),
      (Ha = Ra && Ra.sensorsdata_track),
      (Ba =
        Ha && Ra.sensorsdata_get_server_url && Ra.sensorsdata_get_server_url()),
      Ja && !Ja.bridge.activeBridge && Ba)
    ) {
      if (
        ((Ja.bridge.activeBridge = _s),
        Ja.para.app_js_bridge &&
          !Ja.para.app_js_bridge.is_mui &&
          (Ja.bridge.is_verify_success = Ba && Ja.bridge.validateAppUrl(Ba)),
        (Ja.bridge.bridge_info = {
          touch_app_bridge: !0,
          platform: 'android',
          verify_success: Ja.bridge.is_verify_success ? 'success' : 'fail',
          support_two_way_call: !!Ra.sensorsdata_js_call_app,
        }),
        !Ja.para.app_js_bridge)
      )
        return void qa(
          'app_js_bridge is not configured, data will not be sent by android bridge.',
        );
      Ja.registerInterceptor('sendDataStage', {
        send: { priority: 60, entry: Er },
      }),
        qa('Android bridge inits succeed.');
    }
  }
  function Er(e, t) {
    if (
      Ja.para.app_js_bridge.is_mui ||
      'item_set' === e.data.type ||
      'item_delete' === e.data.type
    )
      return e;
    var r = e.callback;
    return Ja.bridge.is_verify_success
      ? (Ha &&
          Ha.call(
            Ra,
            JSON.stringify(
              Ma.extend({ server_url: Ja.para.server_url }, e.data),
            ),
          ),
        Ma.isFunction(r) && r(),
        t.cancellationToken.cancel(),
        e)
      : Ja.para.app_js_bridge.is_send
      ? (Ja.debug.apph5({ data: e.data, step: '4.2', output: 'all' }), e)
      : (Ma.isFunction(r) && r(), t.cancellationToken.cancel(), e);
  }
  function Lr(e) {
    var t = e.callType;
    return t in ps.commands
      ? ps.commands[t](e, Ra)
      : void (
          Ra &&
          Ma.isFunction(Ra.sensorsdata_js_call_app) &&
          Ra.sensorsdata_js_call_app(JSON.stringify(e))
        );
  }
  function Ur(e) {
    return vs && vs.call(hs, JSON.stringify(e));
  }
  function Rr(e) {
    return ms.call(hs) && ys && ys.call(hs, JSON.stringify(e));
  }
  function Hr(e, t) {
    return t && 'function' == typeof t[e.callType] && t[e.callType]();
  }
  function Br(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Jr(e, t, r) {
    return Br(e, t, r), (e.plugin_version = ws), e;
  }
  function Mr() {
    if (
      ((Ka = window.SensorsData_APP_JS_Bridge),
      (Va = Ka && Ka.sensorsdata_track),
      (Fa = Ka && Ka.sensorsdata_verify),
      (za = Ka && Ka.sensorsdata_visual_verify),
      Wa && !Wa.bridge.activeBridge && (Fa || Va || za))
    ) {
      Wa.bridge.activeBridge = Ss;
      var e = Fa || Va;
      if (
        (za &&
          (e = !!za.call(
            Ka,
            JSON.stringify({ server_url: Wa.para.server_url }),
          )),
        (Wa.bridge.bridge_info = {
          touch_app_bridge: !0,
          platform: 'android',
          verify_success: e ? 'success' : 'fail',
        }),
        !Wa.para.app_js_bridge)
      )
        return void Za(
          'app_js_bridge is not configured, data will not be sent by android obsolete bridge.',
        );
      Wa.registerInterceptor('sendDataStage', {
        send: { priority: 80, entry: qr },
      }),
        Za('Android obsolete bridge inits succeed.');
    }
  }
  function qr(e, t) {
    if (
      Wa.para.app_js_bridge.is_mui ||
      'item_set' === e.data.type ||
      'item_delete' === e.data.type
    )
      return e;
    var r = e.callback;
    if (Fa) {
      var n =
        Fa &&
        Fa.call(
          Ka,
          JSON.stringify(Xa.extend({ server_url: Wa.para.server_url }, e.data)),
        );
      return n
        ? (Xa.isFunction(r) && r(), t.cancellationToken.cancel(), e)
        : Wa.para.app_js_bridge.is_send
        ? (Wa.debug.apph5({ data: e.data, step: '3.1', output: 'all' }), e)
        : (Xa.isFunction(r) && r(), t.cancellationToken.cancel(), e);
    }
    return (
      Va &&
        Va.call(
          Ka,
          JSON.stringify(Xa.extend({ server_url: Wa.para.server_url }, e.data)),
        ),
      Xa.isFunction(r) && r(),
      t.cancellationToken.cancel(),
      e
    );
  }
  function Kr(e) {
    var t = e.callType;
    return t in bs.commands
      ? bs.commands[t](e, Ka)
      : Ka && Xa.isFunction(Ka.sensorsdata_js_call_app)
      ? Ka.sensorsdata_js_call_app(JSON.stringify(e))
      : void 0;
  }
  function Vr(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Fr(e, t, r) {
    return Vr(e, t, r), (e.plugin_version = Ps), e;
  }
  function zr(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Wr(e, t, r) {
    return zr(e, t, r), (e.plugin_version = Os), e;
  }
  function Xr() {
    return 'undefined' != typeof ts && document[ts];
  }
  function Zr(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Gr(e, t, r) {
    return Zr(e, t, r), (e.plugin_version = Ws), e;
  }
  function Qr() {
    if (
      ((Ts =
        window.SensorsData_iOS_JS_Bridge &&
        window.SensorsData_iOS_JS_Bridge.sensorsdata_app_server_url),
      (Is = function () {
        return (
          window.webkit &&
          window.webkit.messageHandlers &&
          window.webkit.messageHandlers.sensorsdataNativeTracker
        );
      }),
      $s && !$s.bridge.activeBridge && Is() && Is().postMessage)
    ) {
      if (
        (($s.bridge.activeBridge = Xs),
        $s.para.app_js_bridge &&
          !$s.para.app_js_bridge.is_mui &&
          ($s.bridge.is_verify_success = Ts && $s.bridge.validateAppUrl(Ts)),
        ($s.bridge.bridge_info = {
          touch_app_bridge: !0,
          platform: 'ios',
          verify_success: $s.bridge.is_verify_success ? 'success' : 'fail',
          support_two_way_call: !0,
        }),
        !$s.para.app_js_bridge)
      )
        return void Ds(
          'app_js_bridge is not configured, data will not be sent by iOS bridge.',
        );
      $s.registerInterceptor('sendDataStage', {
        send: { priority: 70, entry: Yr },
      }),
        Ds('IOS bridge inits succeed.');
    }
  }
  function Yr(e, t) {
    if (
      $s.para.app_js_bridge.is_mui ||
      'item_set' === e.data.type ||
      'item_delete' === e.data.type
    )
      return e;
    var r = e.callback;
    return $s.bridge.is_verify_success
      ? (Is() &&
          Is().postMessage(
            JSON.stringify({
              callType: 'app_h5_track',
              data: As.extend({ server_url: $s.para.server_url }, e.data),
            }),
          ),
        As.isFunction(r) && r(),
        t.cancellationToken.cancel(),
        e)
      : $s.para.app_js_bridge.is_send
      ? ($s.debug.apph5({ data: e.data, step: '4.1', output: 'all' }), e)
      : (As.isFunction(r) && r(), t.cancellationToken.cancel(), e);
  }
  function en(e) {
    var t = e.callType;
    return ('page_info' !== t && 'visualized_track' !== t) ||
      $s.bridge.hasVisualModeBridge()
      ? 'sensorsdata_get_app_visual_config' === t
        ? As.isObject(window.SensorsData_APP_New_H5_Bridge) &&
          window.SensorsData_APP_New_H5_Bridge[t]
        : Is() && Is().postMessage(JSON.stringify(e))
      : null;
  }
  function tn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function rn(e, t, r) {
    return tn(e, t, r), (e.plugin_version = Gs), e;
  }
  function nn() {
    if (xs && !xs.bridge.activeBridge && an()) {
      if (
        ((xs.bridge.activeBridge = Qs),
        (xs.bridge.bridge_info = {
          touch_app_bridge: !0,
          platform: 'ios',
          verify_success: sn() ? 'success' : 'fail',
        }),
        !xs.para.app_js_bridge)
      )
        return void Ls(
          'app_js_bridge is not configured, data will not be sent by iOS obsolete bridge.',
        );
      xs.registerInterceptor('sendDataStage', {
        send: { priority: 90, entry: on },
      }),
        Ls('IOS obsolete bridge inits succeed.');
    }
  }
  function an() {
    return (
      (/sensors-verify/.test(navigator.userAgent) ||
        /sa-sdk-ios/.test(navigator.userAgent)) &&
      !window.MSStream
    );
  }
  function sn() {
    if (/sensors-verify/.test(navigator.userAgent)) {
      var e = navigator.userAgent.match(/sensors-verify\/([^\s]+)/);
      if (
        e &&
        e[0] &&
        'string' == typeof e[1] &&
        2 === e[1].split('?').length
      ) {
        e = e[1].split('?');
        var t = null,
          r = null;
        try {
          (t = Es.URL(xs.para.server_url).hostname),
            (r =
              Es.URL(xs.para.server_url).searchParams.get('project') ||
              'default');
        } catch (n) {
          xs.log(n);
        }
        return !(!t || t !== e[0] || !r || r !== e[1]);
      }
      return !1;
    }
    return !!/sa-sdk-ios/.test(navigator.userAgent);
  }
  function on(e, t) {
    function r(e) {
      var t = JSON.stringify(Es.extend({ server_url: xs.para.server_url }, e));
      return (
        (t = t.replace(/\r\n/g, '')),
        (t = encodeURIComponent(t)),
        'sensorsanalytics://trackEvent?event=' + t
      );
    }
    if (
      xs.para.app_js_bridge.is_mui ||
      'item_set' === e.data.type ||
      'item_delete' === e.data.type
    )
      return e;
    var n = e.callback;
    if (xs.bridge.bridge_info.verify_success) {
      var i = document.createElement('iframe'),
        a = r(e.data);
      return (
        i.setAttribute('src', a),
        document.documentElement.appendChild(i),
        i.parentNode.removeChild(i),
        (i = null),
        Es.isFunction(n) && n(),
        t.cancellationToken.cancel(),
        !0
      );
    }
    return xs.para.app_js_bridge.is_send
      ? (xs.debug.apph5({ data: e.data, step: '3.2', output: 'all' }), e)
      : (Es.isFunction(n) && n(), t.cancellationToken.cancel(), e);
  }
  function ln(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function un(e, t, r) {
    return ln(e, t, r), (e.plugin_version = eo), e;
  }
  function cn() {
    (this.sd = null),
      (this.start_time = +new Date()),
      (this.page_show_status = !0),
      (this.page_hidden_status = !1),
      (this._ = {}),
      (this.timer = null),
      (this.current_page_url = document.referrer),
      (this.url = location.href),
      (this.title = document.title || ''),
      (this.option = {}),
      (this.heartbeat_interval_time = 5e3),
      (this.heartbeat_interval_timer = null),
      (this.page_id = null),
      (this.storage_name = 'sawebjssdkpageleave'),
      (this.max_duration = ro);
  }
  function dn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function pn(e, t, r) {
    return dn(e, t, r), (e.plugin_version = ao), e;
  }
  function fn(e, t) {
    if ('track' !== e.type) return e;
    var r = t.sd,
      n = r._,
      i = r.saEvent.check,
      a = n.extend2Lev({ properties: {} }, e),
      s = t.customRegister,
      o = a.properties,
      l = a.event,
      u = {};
    return (
      n.each(s, function (e) {
        if (n.isObject(e))
          n.indexOf(e.events, l) > -1 &&
            i({ properties: e.properties }) &&
            (u = n.extend(u, e.properties));
        else if (n.isFunction(e)) {
          var t = e({ event: l, properties: o, data: a });
          n.isObject(t) &&
            !n.isEmptyObject(t) &&
            i({ properties: t }) &&
            (u = n.extend(u, t));
        }
      }),
      (e.properties = n.extend(o, u)),
      e
    );
  }
  function _n() {
    (this.sd = null),
      (this.log = (window.console && window.console.log) || function () {}),
      (this.customRegister = []);
  }
  function gn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function hn(e, t, r) {
    return gn(e, t, r), (e.plugin_version = uo), e;
  }
  function mn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function vn(e, t, r) {
    return mn(e, t, r), (e.plugin_version = go), e;
  }
  function yn(e) {
    try {
      if (
        '$pageview' !== e.event &&
        (!e.type || 'profile' !== e.type.slice(0, 7))
      ) {
        var t =
            window.innerHeight ||
            document.documentElement.clientHeight ||
            document.body.clientHeight ||
            0,
          r = document.documentElement.scrollHeight || 0,
          n = { $page_height: Math.max(t, r) || 0 };
        e.properties = co._.extend(e.properties || {}, n);
      }
    } catch (i) {
      ho('\u9875\u9762\u9ad8\u5ea6\u83b7\u53d6\u5f02\u5e38\u3002');
    }
    return po.call(co.kit, e);
  }
  function bn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function wn(e, t, r) {
    return bn(e, t, r), (e.plugin_version = yo), e;
  }
  function Sn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function kn(e, t, r) {
    return Sn(e, t, r), (e.plugin_version = Lo), e;
  }
  function Pn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Cn(e, t, r) {
    return Pn(e, t, r), (e.plugin_version = Ho), e;
  }
  function Nn() {
    Bo = !0;
  }
  function On() {
    Bo = !1;
  }
  function jn() {
    return Bo;
  }
  function Tn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function In(e, t, r) {
    return Tn(e, t, r), (e.plugin_version = Ko), e;
  }
  function $n(e) {
    var t = e,
      r = '';
    (r =
      So.para.debug_mode_url.indexOf('?') !== -1
        ? So.para.debug_mode_url + '&' + So.kit.encodeTrackData(e)
        : So.para.debug_mode_url + '?' + So.kit.encodeTrackData(e)),
      ko.ajax({
        url: r,
        type: 'GET',
        cors: !0,
        header: { 'Dry-Run': String(So.para.debug_mode_upload) },
        success: function (e) {
          ko.isEmptyObject(e) === !0
            ? alert('debug\u6570\u636e\u53d1\u9001\u6210\u529f' + t)
            : alert(
                'debug\u5931\u8d25 \u9519\u8bef\u539f\u56e0' +
                  JSON.stringify(e),
              );
        },
      });
  }
  function An(e, t) {
    if (So.para.debug_mode === !0) {
      var r = e.data;
      e.callback, $n(JSON.stringify(r)), t.cancellationToken.stop();
    }
    return e;
  }
  function Dn() {
    So.para.debug_mode === !0 &&
      ((So.para.debug_mode_upload = So.para.debug_mode_upload || !1),
      ko.isString(So.para.debug_mode_url) ||
        (ko.isString(So.para.server_url)
          ? (So.para.debug_mode_url = So.para.server_url.replace(
              'sa.gif',
              'debug',
            ))
          : ko.isArray(So.para.server_url) && ko.isString(So.para.server_url[0])
          ? (So.para.debug_mode_url = So.para.server_url[0].replace(
              'sa.gif',
              'debug',
            ))
          : (So.para.debug_mode = !1)));
  }
  function xn() {
    So.on('sdkInitPara', function () {
      Dn();
    }),
      So.on('sdkAfterInitPara', function () {
        So.registerInterceptor('sendDataStage', {
          send: { priority: 30, entry: An },
        });
      });
  }
  function En(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Ln(e, t, r) {
    return En(e, t, r), (e.plugin_version = zo), e;
  }
  function Un(e, t) {
    if (
      Co.isObject(Po.para.jsapp) &&
      !Po.para.jsapp.isOnline &&
      'function' == typeof Po.para.jsapp.setData
    ) {
      var r = e;
      delete r.callback,
        (r = JSON.stringify(r)),
        Po.para.jsapp.setData(r),
        t.cancellationToken.stop();
    }
    return e;
  }
  function Rn() {
    Po.on('sdkAfterInitAPI', function () {
      Co.isObject(Po.commonWays) && (Po.commonWays.setOnlineState = Hn),
        Po.registerInterceptor('sendDataStage', {
          send: { priority: 40, entry: Un },
        });
    });
  }
  function Hn(e) {
    if (
      e === !0 &&
      Co.isObject(Po.para.jsapp) &&
      'function' == typeof Po.para.jsapp.getData
    ) {
      Po.para.jsapp.isOnline = !0;
      var t = Po.para.jsapp.getData();
      Co.isArray(t) &&
        t.length > 0 &&
        Co.each(t, function (e) {
          Co.isJSONString(e) && Po.kit.sendData(JSON.parse(e));
        });
    } else Po.para.jsapp.isOnline = !1;
  }
  function Bn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Jn(e, t, r) {
    return Bn(e, t, r), (e.plugin_version = Zo), e;
  }
  function Mn(e, t) {
    return (
      !No.para.app_js_bridge &&
        No.para.batch_send &&
        Oo.localStorage.isSupport() &&
        localStorage.length < No.para.batch_send.storage_length &&
        (Go.add(e.data), t.cancellationToken.stop()),
      e
    );
  }
  function qn() {
    var e = { datasend_timeout: 6e3, send_interval: 6e3, storage_length: 200 };
    Oo.localStorage.isSupport() &&
    Oo.isSupportCors() &&
    'object' == typeof localStorage
      ? No.para.batch_send === !0
        ? (No.para.batch_send = Oo.extend({}, e))
        : 'object' == typeof No.para.batch_send &&
          (No.para.batch_send = Oo.extend({}, e, No.para.batch_send))
      : (No.para.batch_send = !1);
  }
  function Kn() {
    No.on('sdkInitPara', function () {
      qn();
    }),
      No.on('sdkAfterInitPara', function () {
        !No.para.app_js_bridge &&
          No.para.batch_send &&
          Oo.localStorage.isSupport() &&
          (Go || (Go = new Oo.BatchSend()),
          Go.batchInterval(),
          No.registerInterceptor('sendDataStage', {
            send: { priority: 100, entry: Mn },
          }));
      });
  }
  function Vn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Fn(e, t, r) {
    return Vn(e, t, r), (e.plugin_version = el), e;
  }
  function zn(e) {
    var t = new To.BeaconSend(e);
    t.start();
  }
  function Wn(e, t) {
    if ('beacon' === jo.para.send_type) {
      var r = e.server_url;
      (e.data = jo.kit.encodeTrackData(e.data)),
        To.isArray(r) && r.length
          ? To.each(r, function (t) {
              (e.callback = null), (e.server_url = t), zn(e);
            })
          : 'string' == typeof jo.para.server_url && '' !== jo.para.server_url
          ? zn(e)
          : jo.log(
              '\u5f53\u524d server_url \u4e3a\u7a7a\u6216\u4e0d\u6b63\u786e\uff0c\u53ea\u5728\u63a7\u5236\u53f0\u6253\u5370\u65e5\u5fd7\uff0cnetwork \u4e2d\u4e0d\u4f1a\u53d1\u6570\u636e\uff0c\u8bf7\u914d\u7f6e\u6b63\u786e\u7684 server_url\uff01',
            ),
        t.cancellationToken.stop();
    }
    return e;
  }
  function Xn() {
    'beacon' !== jo.para.send_type ||
      To.isSupportBeaconSend() ||
      (jo.para.send_type = 'image');
  }
  function Zn() {
    jo.on('sdkInitPara', function () {
      Xn();
    }),
      jo.on('sdkAfterInitPara', function () {
        jo.registerInterceptor('sendDataStage', {
          send: { priority: 110, entry: Wn },
        });
      });
  }
  function Gn(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function Qn(e, t, r) {
    return Gn(e, t, r), (e.plugin_version = nl), e;
  }
  function Yn(e) {
    var t = new $o.AjaxSend(e);
    t.start();
  }
  function ei(e, t) {
    if ('ajax' === Io.para.send_type) {
      var r = e.server_url;
      (e.data = Io.kit.encodeTrackData(e.data)),
        $o.isArray(r) && r.length
          ? $o.each(r, function (t) {
              (e.callback = null), (e.server_url = t), Yn(e);
            })
          : 'string' == typeof Io.para.server_url && '' !== Io.para.server_url
          ? Yn(e)
          : Io.log(
              '\u5f53\u524d server_url \u4e3a\u7a7a\u6216\u4e0d\u6b63\u786e\uff0c\u53ea\u5728\u63a7\u5236\u53f0\u6253\u5370\u65e5\u5fd7\uff0cnetwork \u4e2d\u4e0d\u4f1a\u53d1\u6570\u636e\uff0c\u8bf7\u914d\u7f6e\u6b63\u786e\u7684 server_url\uff01',
            ),
        t.cancellationToken.stop();
    }
    return e;
  }
  function ti() {
    'ajax' !== Io.para.send_type ||
      $o.isSupportCors() ||
      (Io.para.send_type = 'image');
  }
  function ri() {
    Io.on('sdkInitPara', function () {
      ti();
    }),
      Io.on('sdkAfterInitPara', function () {
        Io.registerInterceptor('sendDataStage', {
          send: { priority: 120, entry: ei },
        });
      });
  }
  function ni(e, t, r) {
    if ((t && (e.plugin_name = t), r && e.init)) {
      var n = e.init;
      e.init = function (t, i) {
        function a() {
          n.call(e, t, i);
        }
        return (t.readyState && t.readyState.state >= 3) || !t.on
          ? a()
          : void t.on(r, a);
      };
    }
    return e;
  }
  function ii(e, t, r) {
    return ni(e, t, r), (e.plugin_version = sl), e;
  }
  function ai(e, t) {
    var r = Ao.kit.encodeTrackData(t);
    return e.indexOf('?') !== -1 ? e + '&' + r : e + '?' + r;
  }
  function si(e) {
    var t = new Do.ImageSend(e);
    t.start();
  }
  function oi(e, t) {
    var r = e.server_url;
    (e.data = ai(r, e.data)),
      Do.isArray(r) && r.length
        ? Do.each(r, function (t) {
            (e.callback = null), (e.server_url = t), si(e);
          })
        : 'string' == typeof Ao.para.server_url && '' !== Ao.para.server_url
        ? si(e)
        : Ao.log(
            '\u5f53\u524d server_url \u4e3a\u7a7a\u6216\u4e0d\u6b63\u786e\uff0c\u53ea\u5728\u63a7\u5236\u53f0\u6253\u5370\u65e5\u5fd7\uff0cnetwork \u4e2d\u4e0d\u4f1a\u53d1\u6570\u636e\uff0c\u8bf7\u914d\u7f6e\u6b63\u786e\u7684 server_url\uff01',
          ),
      t.cancellationToken.stop();
  }
  function li() {
    'image' !== Ao.para.send_type &&
      'ajax' !== Ao.para.send_type &&
      'beacon' !== Ao.para.send_type &&
      (Ao.para.send_type = 'image');
  }
  function ui() {
    Ao.on('sdkInitPara', function () {
      li();
    }),
      Ao.on('sdkAfterInitPara', function () {
        Ao.registerInterceptor('sendDataStage', {
          send: { priority: 130, entry: oi },
        });
      });
  }
  var ci = {};
  (function () {
    function e(n, i) {
      function a(e, t) {
        try {
          e();
        } catch (r) {
          t && t();
        }
      }
      function s(e) {
        if (null != s[e]) return s[e];
        var t;
        if ('bug-string-char-index' == e) t = 'a' != 'a'[0];
        else if ('json' == e)
          t = s('json-stringify') && s('date-serialization') && s('json-parse');
        else if ('date-serialization' == e) {
          if ((t = s('json-stringify') && b)) {
            var r = i.stringify;
            a(function () {
              t =
                '"-271821-04-20T00:00:00.000Z"' == r(new d(-864e13)) &&
                '"+275760-09-13T00:00:00.000Z"' == r(new d(864e13)) &&
                '"-000001-01-01T00:00:00.000Z"' == r(new d(-621987552e5)) &&
                '"1969-12-31T23:59:59.999Z"' == r(new d(-1));
            });
          }
        } else {
          var n,
            o = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
          if ('json-stringify' == e) {
            var r = i.stringify,
              c = 'function' == typeof r;
            c &&
              (((n = function () {
                return 1;
              }).toJSON = n),
              a(
                function () {
                  c =
                    '0' === r(0) &&
                    '0' === r(new l()) &&
                    '""' == r(new u()) &&
                    r(v) === h &&
                    r(h) === h &&
                    r() === h &&
                    '1' === r(n) &&
                    '[1]' == r([n]) &&
                    '[null]' == r([h]) &&
                    'null' == r(null) &&
                    '[null,null,null]' == r([h, v, null]) &&
                    r({ a: [n, !0, !1, null, '\0\b\n\f\r\t'] }) == o &&
                    '1' === r(null, n) &&
                    '[\n 1,\n 2\n]' == r([1, 2], null, 1);
                },
                function () {
                  c = !1;
                },
              )),
              (t = c);
          }
          if ('json-parse' == e) {
            var p,
              f = i.parse;
            'function' == typeof f &&
              a(
                function () {
                  0 !== f('0') ||
                    f(!1) ||
                    ((n = f(o)),
                    (p = 5 == n.a.length && 1 === n.a[0]),
                    p &&
                      (a(function () {
                        p = !f('"\t"');
                      }),
                      p &&
                        a(function () {
                          p = 1 !== f('01');
                        }),
                      p &&
                        a(function () {
                          p = 1 !== f('1.');
                        })));
                },
                function () {
                  p = !1;
                },
              ),
              (t = p);
          }
        }
        return (s[e] = !!t);
      }
      function o(e) {
        return A(this);
      }
      n || (n = r.Object()), i || (i = r.Object());
      var l = n.Number || r.Number,
        u = n.String || r.String,
        c = n.Object || r.Object,
        d = n.Date || r.Date,
        p = n.SyntaxError || r.SyntaxError,
        f = n.TypeError || r.TypeError,
        _ = n.Math || r.Math,
        g = n.JSON || r.JSON;
      if ('object' == typeof g && g)
        return (
          (i.stringify = g.stringify),
          (i.parse = g.parse),
          (i.runInContext = e),
          i
        );
      var h,
        m = c.prototype,
        v = m.toString,
        y = m.hasOwnProperty,
        b = new d(-0xc782b5b800cec);
      if (
        (a(function () {
          b =
            b.getUTCFullYear() == -109252 &&
            0 === b.getUTCMonth() &&
            1 === b.getUTCDate() &&
            10 == b.getUTCHours() &&
            37 == b.getUTCMinutes() &&
            6 == b.getUTCSeconds() &&
            708 == b.getUTCMilliseconds();
        }),
        (s['bug-string-char-index'] =
          s['date-serialization'] =
          s.json =
          s['json-stringify'] =
          s['json-parse'] =
            null),
        !s('json'))
      ) {
        var w = '[object Function]',
          S = '[object Date]',
          k = '[object Number]',
          P = '[object String]',
          C = '[object Array]',
          N = '[object Boolean]',
          O = s('bug-string-char-index'),
          j = function (e, r) {
            var n,
              i,
              a,
              s = 0;
            ((n = function () {
              this.valueOf = 0;
            }).prototype.valueOf = 0),
              (i = new n());
            for (a in i) y.call(i, a) && s++;
            return (
              (n = i = null),
              s
                ? (j = function (e, t) {
                    var r,
                      n,
                      i = v.call(e) == w;
                    for (r in e)
                      (i && 'prototype' == r) ||
                        !y.call(e, r) ||
                        (n = 'constructor' === r) ||
                        t(r);
                    (n || y.call(e, (r = 'constructor'))) && t(r);
                  })
                : ((i = [
                    'valueOf',
                    'toString',
                    'toLocaleString',
                    'propertyIsEnumerable',
                    'isPrototypeOf',
                    'hasOwnProperty',
                    'constructor',
                  ]),
                  (j = function (e, r) {
                    var n,
                      a,
                      s = v.call(e) == w,
                      o =
                        (!s &&
                          'function' != typeof e.constructor &&
                          t[typeof e.hasOwnProperty] &&
                          e.hasOwnProperty) ||
                        y;
                    for (n in e)
                      (s && 'prototype' == n) || !o.call(e, n) || r(n);
                    for (a = i.length; (n = i[--a]); ) o.call(e, n) && r(n);
                  })),
              j(e, r)
            );
          };
        if (!s('json-stringify') && !s('date-serialization')) {
          var T = {
              92: '\\\\',
              34: '\\"',
              8: '\\b',
              12: '\\f',
              10: '\\n',
              13: '\\r',
              9: '\\t',
            },
            I = '000000',
            $ = function (e, t) {
              return (I + (t || 0)).slice(-e);
            },
            A = function (e) {
              var t, r, n, i, a, s, o, l, u;
              if (b)
                t = function (e) {
                  (r = e.getUTCFullYear()),
                    (n = e.getUTCMonth()),
                    (i = e.getUTCDate()),
                    (s = e.getUTCHours()),
                    (o = e.getUTCMinutes()),
                    (l = e.getUTCSeconds()),
                    (u = e.getUTCMilliseconds());
                };
              else {
                var c = _.floor,
                  d = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334],
                  p = function (e, t) {
                    return (
                      d[t] +
                      365 * (e - 1970) +
                      c((e - 1969 + (t = +(t > 1))) / 4) -
                      c((e - 1901 + t) / 100) +
                      c((e - 1601 + t) / 400)
                    );
                  };
                t = function (e) {
                  for (
                    i = c(e / 864e5), r = c(i / 365.2425) + 1970 - 1;
                    p(r + 1, 0) <= i;
                    r++
                  );
                  for (n = c((i - p(r, 0)) / 30.42); p(r, n + 1) <= i; n++);
                  (i = 1 + i - p(r, n)),
                    (a = ((e % 864e5) + 864e5) % 864e5),
                    (s = c(a / 36e5) % 24),
                    (o = c(a / 6e4) % 60),
                    (l = c(a / 1e3) % 60),
                    (u = a % 1e3);
                };
              }
              return (A = function (e) {
                return (
                  e > -1 / 0 && e < 1 / 0
                    ? (t(e),
                      (e =
                        (r <= 0 || r >= 1e4
                          ? (r < 0 ? '-' : '+') + $(6, r < 0 ? -r : r)
                          : $(4, r)) +
                        '-' +
                        $(2, n + 1) +
                        '-' +
                        $(2, i) +
                        'T' +
                        $(2, s) +
                        ':' +
                        $(2, o) +
                        ':' +
                        $(2, l) +
                        '.' +
                        $(3, u) +
                        'Z'),
                      (r = n = i = s = o = l = u = null))
                    : (e = null),
                  e
                );
              })(e);
            };
          if (s('json-stringify') && !s('date-serialization')) {
            var D = i.stringify;
            i.stringify = function (e, t, r) {
              var n = d.prototype.toJSON;
              d.prototype.toJSON = o;
              var i = D(e, t, r);
              return (d.prototype.toJSON = n), i;
            };
          } else {
            var x = '\\u00',
              E = function (e) {
                var t = e.charCodeAt(0),
                  r = T[t];
                return r ? r : x + $(2, t.toString(16));
              },
              L = /[\x00-\x1f\x22\x5c]/g,
              U = function (e) {
                return (
                  (L.lastIndex = 0),
                  '"' + (L.test(e) ? e.replace(L, E) : e) + '"'
                );
              },
              R = function (e, t, r, n, i, s, o) {
                var l, u, c, p, _, g, m, y, b;
                if (
                  (a(function () {
                    l = t[e];
                  }),
                  'object' == typeof l &&
                    l &&
                    (l.getUTCFullYear &&
                    v.call(l) == S &&
                    l.toJSON === d.prototype.toJSON
                      ? (l = A(l))
                      : 'function' == typeof l.toJSON && (l = l.toJSON(e))),
                  r && (l = r.call(t, e, l)),
                  l == h)
                )
                  return l === h ? l : 'null';
                switch (
                  ((u = typeof l), 'object' == u && (c = v.call(l)), c || u)
                ) {
                  case 'boolean':
                  case N:
                    return '' + l;
                  case 'number':
                  case k:
                    return l > -1 / 0 && l < 1 / 0 ? '' + l : 'null';
                  case 'string':
                  case P:
                    return U('' + l);
                }
                if ('object' == typeof l) {
                  for (m = o.length; m--; ) if (o[m] === l) throw f();
                  if ((o.push(l), (p = []), (y = s), (s += i), c == C)) {
                    for (g = 0, m = l.length; g < m; g++)
                      (_ = R(g, l, r, n, i, s, o)),
                        p.push(_ === h ? 'null' : _);
                    b = p.length
                      ? i
                        ? '[\n' + s + p.join(',\n' + s) + '\n' + y + ']'
                        : '[' + p.join(',') + ']'
                      : '[]';
                  } else
                    j(n || l, function (e) {
                      var t = R(e, l, r, n, i, s, o);
                      t !== h && p.push(U(e) + ':' + (i ? ' ' : '') + t);
                    }),
                      (b = p.length
                        ? i
                          ? '{\n' + s + p.join(',\n' + s) + '\n' + y + '}'
                          : '{' + p.join(',') + '}'
                        : '{}');
                  return o.pop(), b;
                }
              };
            i.stringify = function (e, r, n) {
              var i, a, s, o;
              if (t[typeof r] && r)
                if (((o = v.call(r)), o == w)) a = r;
                else if (o == C) {
                  s = {};
                  for (var l, u = 0, c = r.length; u < c; )
                    (l = r[u++]),
                      (o = v.call(l)),
                      ('[object String]' != o && '[object Number]' != o) ||
                        (s[l] = 1);
                }
              if (n)
                if (((o = v.call(n)), o == k)) {
                  if ((n -= n % 1) > 0)
                    for (n > 10 && (n = 10), i = ''; i.length < n; ) i += ' ';
                } else o == P && (i = n.length <= 10 ? n : n.slice(0, 10));
              return R('', ((l = {}), (l[''] = e), l), a, s, i, '', []);
            };
          }
        }
        if (!s('json-parse')) {
          var H,
            B,
            J = u.fromCharCode,
            M = {
              92: '\\',
              34: '"',
              47: '/',
              98: '\b',
              116: '\t',
              110: '\n',
              102: '\f',
              114: '\r',
            },
            q = function () {
              throw ((H = B = null), p());
            },
            K = function () {
              for (var e, t, r, n, i, a = B, s = a.length; H < s; )
                switch ((i = a.charCodeAt(H))) {
                  case 9:
                  case 10:
                  case 13:
                  case 32:
                    H++;
                    break;
                  case 123:
                  case 125:
                  case 91:
                  case 93:
                  case 58:
                  case 44:
                    return (e = O ? a.charAt(H) : a[H]), H++, e;
                  case 34:
                    for (e = '@', H++; H < s; )
                      if (((i = a.charCodeAt(H)), i < 32)) q();
                      else if (92 == i)
                        switch ((i = a.charCodeAt(++H))) {
                          case 92:
                          case 34:
                          case 47:
                          case 98:
                          case 116:
                          case 110:
                          case 102:
                          case 114:
                            (e += M[i]), H++;
                            break;
                          case 117:
                            for (t = ++H, r = H + 4; H < r; H++)
                              (i = a.charCodeAt(H)),
                                (i >= 48 && i <= 57) ||
                                  (i >= 97 && i <= 102) ||
                                  (i >= 65 && i <= 70) ||
                                  q();
                            e += J('0x' + a.slice(t, H));
                            break;
                          default:
                            q();
                        }
                      else {
                        if (34 == i) break;
                        for (
                          i = a.charCodeAt(H), t = H;
                          i >= 32 && 92 != i && 34 != i;

                        )
                          i = a.charCodeAt(++H);
                        e += a.slice(t, H);
                      }
                    if (34 == a.charCodeAt(H)) return H++, e;
                    q();
                  default:
                    if (
                      ((t = H),
                      45 == i && ((n = !0), (i = a.charCodeAt(++H))),
                      i >= 48 && i <= 57)
                    ) {
                      for (
                        48 == i &&
                          ((i = a.charCodeAt(H + 1)), i >= 48 && i <= 57) &&
                          q(),
                          n = !1;
                        H < s && ((i = a.charCodeAt(H)), i >= 48 && i <= 57);
                        H++
                      );
                      if (46 == a.charCodeAt(H)) {
                        for (
                          r = ++H;
                          r < s && ((i = a.charCodeAt(r)), !(i < 48 || i > 57));
                          r++
                        );
                        r == H && q(), (H = r);
                      }
                      if (((i = a.charCodeAt(H)), 101 == i || 69 == i)) {
                        for (
                          i = a.charCodeAt(++H),
                            (43 != i && 45 != i) || H++,
                            r = H;
                          r < s && ((i = a.charCodeAt(r)), !(i < 48 || i > 57));
                          r++
                        );
                        r == H && q(), (H = r);
                      }
                      return +a.slice(t, H);
                    }
                    n && q();
                    var o = a.slice(H, H + 4);
                    if ('true' == o) return (H += 4), !0;
                    if ('fals' == o && 101 == a.charCodeAt(H + 4))
                      return (H += 5), !1;
                    if ('null' == o) return (H += 4), null;
                    q();
                }
              return '$';
            },
            V = function (e) {
              var t, r;
              if (('$' == e && q(), 'string' == typeof e)) {
                if ('@' == (O ? e.charAt(0) : e[0])) return e.slice(1);
                if ('[' == e) {
                  for (t = []; (e = K()), ']' != e; )
                    r
                      ? ',' == e
                        ? ((e = K()), ']' == e && q())
                        : q()
                      : (r = !0),
                      ',' == e && q(),
                      t.push(V(e));
                  return t;
                }
                if ('{' == e) {
                  for (t = {}; (e = K()), '}' != e; )
                    r
                      ? ',' == e
                        ? ((e = K()), '}' == e && q())
                        : q()
                      : (r = !0),
                      (',' != e &&
                        'string' == typeof e &&
                        '@' == (O ? e.charAt(0) : e[0]) &&
                        ':' == K()) ||
                        q(),
                      (t[e.slice(1)] = V(K()));
                  return t;
                }
                q();
              }
              return e;
            },
            F = function (e, t, r) {
              var n = z(e, t, r);
              n === h ? delete e[t] : (e[t] = n);
            },
            z = function (e, t, r) {
              var n,
                i = e[t];
              if ('object' == typeof i && i)
                if (v.call(i) == C) for (n = i.length; n--; ) F(v, j, i, n, r);
                else
                  j(i, function (e) {
                    F(i, e, r);
                  });
              return r.call(e, t, i);
            };
          i.parse = function (e, t) {
            var r, n;
            return (
              (H = 0),
              (B = '' + e),
              (r = V(K())),
              '$' != K() && q(),
              (H = B = null),
              t && v.call(t) == w ? z(((n = {}), (n[''] = r), n), '', t) : r
            );
          };
        }
      }
      return (i.runInContext = e), i;
    }
    var t = { 'function': !0, object: !0 },
      r = (t[typeof window] && window) || this,
      n = r.JSON,
      i = r.JSON3,
      a = !1,
      s = e(
        r,
        (r.JSON3 = {
          noConflict: function () {
            return (
              a || ((a = !0), (r.JSON = n), (r.JSON3 = i), (n = i = null)), s
            );
          },
        }),
      );
    r.JSON = { parse: s.parse, stringify: s.stringify };
  }).call(window),
    (function (e, t) {
      t(e);
    })(window, function (e) {
      if (e.atob)
        try {
          e.atob(' ');
        } catch (t) {
          e.atob = (function (e) {
            var t = function (t) {
              return e(String(t).replace(/[\t\n\f\r ]+/g, ''));
            };
            return (t.original = e), t;
          })(e.atob);
        }
      else {
        var r =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
          n =
            /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
        (e.btoa = function (e) {
          e = String(e);
          for (
            var t, n, i, a, s = '', o = 0, l = e.length % 3;
            o < e.length;

          ) {
            if (
              (n = e.charCodeAt(o++)) > 255 ||
              (i = e.charCodeAt(o++)) > 255 ||
              (a = e.charCodeAt(o++)) > 255
            )
              return '';
            (t = (n << 16) | (i << 8) | a),
              (s +=
                r.charAt((t >> 18) & 63) +
                r.charAt((t >> 12) & 63) +
                r.charAt((t >> 6) & 63) +
                r.charAt(63 & t));
          }
          return l ? s.slice(0, l - 3) + '==='.substring(l) : s;
        }),
          (e.atob = function (e) {
            if (((e = String(e).replace(/[\t\n\f\r ]+/g, '')), !n.test(e)))
              return '';
            e += '=='.slice(2 - (3 & e.length));
            for (var t, i, a, s = '', o = 0; o < e.length; )
              (t =
                (r.indexOf(e.charAt(o++)) << 18) |
                (r.indexOf(e.charAt(o++)) << 12) |
                ((i = r.indexOf(e.charAt(o++))) << 6) |
                (a = r.indexOf(e.charAt(o++)))),
                (s +=
                  64 === i
                    ? String.fromCharCode((t >> 16) & 255)
                    : 64 === a
                    ? String.fromCharCode((t >> 16) & 255, (t >> 8) & 255)
                    : String.fromCharCode(
                        (t >> 16) & 255,
                        (t >> 8) & 255,
                        255 & t,
                      ));
            return s;
          });
      }
    });
  var di,
    pi = {
      setup: function (e) {
        di = e;
      },
      log: function () {
        (di || (console && console.log) || function () {}).apply(
          null,
          arguments,
        );
      },
    },
    fi = {
      get: function (e) {
        return window.localStorage.getItem(e);
      },
      parse: function (e) {
        var t;
        try {
          t = JSON.parse(fi.get(e)) || null;
        } catch (r) {
          pi.log('parse localStorage failed');
        }
        return t;
      },
      set: function (e, t) {
        try {
          window.localStorage.setItem(e, t);
        } catch (r) {
          pi.log('localStorage is not support');
        }
      },
      remove: function (e) {
        window.localStorage.removeItem(e);
      },
      isSupport: function () {
        var e = !0;
        try {
          var t = '__local_store_support__',
            r = 'testIsSupportStorage';
          fi.set(t, r), fi.get(t) !== r && (e = !1), fi.remove(t);
        } catch (n) {
          e = !1;
        }
        return e;
      },
    },
    _i = (function () {
      function e() {
        return (r = (9301 * r + 49297) % 233280), r / 233280;
      }
      var t = new Date(),
        r = t.getTime();
      return function (t) {
        return Math.ceil(e() * t);
      };
    })();
  (a.prototype.get = function (e, r, a, s) {
    if (!e) throw new Error('key is must');
    (r = r || 1e4), (a = a || 1e3), (s = s || function () {});
    var o = this.lockGetPrefix + e,
      l = fi.get(o),
      u = String(n());
    return l &&
      ((l = i(l) || { randomNum: 0, expireTime: 0 }), l.expireTime > t())
      ? s(null)
      : (fi.set(o, JSON.stringify({ randomNum: u, expireTime: t() + r })),
        void setTimeout(function () {
          (l = i(fi.get(o)) || { randomNum: 0, expireTime: 0 }),
            l && l.randomNum === u
              ? (s(fi.get(e)), fi.remove(e), fi.remove(o))
              : s(null);
        }, a));
  }),
    (a.prototype.set = function (e, r, a, s, o) {
      if (!e || !r) throw new Error('key and val is must');
      (a = a || 1e4), (s = s || 1e3), (o = o || function () {});
      var l = this.lockSetPrefix + e,
        u = fi.get(l),
        c = String(n());
      return u &&
        ((u = i(u) || { randomNum: 0, expireTime: 0 }), u.expireTime > t())
        ? o({ status: 'fail', reason: 'This key is locked' })
        : (fi.set(l, JSON.stringify({ randomNum: c, expireTime: t() + a })),
          void setTimeout(function () {
            (u = i(fi.get(l)) || { randomNum: 0, expireTime: 0 }),
              u.randomNum === c
                ? fi.set(e, r) && o({ status: 'success' })
                : o({ status: 'fail', reason: 'This key is locked' });
          }, s));
    }),
    (l.prototype.on = function (e, t) {
      if (!e || !t) return !1;
      if (!s(t)) throw new Error('listener must be a function');
      this._events[e] = this._events[e] || [];
      var r = 'object' == typeof t;
      return this._events[e].push(r ? t : { listener: t, once: !1 }), this;
    }),
    (l.prototype.prepend = function (e, t) {
      if (!e || !t) return !1;
      if (!s(t)) throw new Error('listener must be a function');
      this._events[e] = this._events[e] || [];
      var r = 'object' == typeof t;
      return this._events[e].unshift(r ? t : { listener: t, once: !1 }), this;
    }),
    (l.prototype.prependOnce = function (e, t) {
      return this.prepend(e, { listener: t, once: !0 });
    }),
    (l.prototype.once = function (e, t) {
      return this.on(e, { listener: t, once: !0 });
    }),
    (l.prototype.off = function (e, t) {
      var r = this._events[e];
      if (!r) return !1;
      if ('number' == typeof t) r.splice(t, 1);
      else if ('function' == typeof t)
        for (var n = 0, i = r.length; n < i; n++)
          r[n] && r[n].listener === t && r.splice(n, 1);
      return this;
    }),
    (l.prototype.emit = function (e, t) {
      var r = this._events[e];
      if (!r) return !1;
      for (var n = 0; n < r.length; n++) {
        var i = r[n];
        i && (i.listener.call(this, t || {}), i.once && this.off(e, n));
      }
      return this;
    }),
    (l.prototype.removeAllListeners = function (e) {
      e && this._events[e] ? (this._events[e] = []) : (this._events = {});
    }),
    (l.prototype.listeners = function (e) {
      return e && 'string' == typeof e ? this._events[e] : this._events;
    });
  var gi = (function () {
      var e = function () {
          for (var e = 1 * new Date(), t = 0; e == 1 * new Date(); ) t++;
          return e.toString(16) + t.toString(16);
        },
        t = function () {
          return n().toString(16).replace('.', '');
        },
        r = function () {
          function e(e, t) {
            var r,
              n = 0;
            for (r = 0; r < t.length; r++) n |= i[r] << (8 * r);
            return e ^ n;
          }
          var t,
            r,
            n = navigator.userAgent,
            i = [],
            a = 0;
          for (t = 0; t < n.length; t++)
            (r = n.charCodeAt(t)),
              i.unshift(255 & r),
              i.length >= 4 && ((a = e(a, i)), (i = []));
          return i.length > 0 && (a = e(a, i)), a.toString(16);
        };
      return function () {
        var i = String(screen.height * screen.width);
        i =
          i && /\d{5,}/.test(i)
            ? i.toString(16)
            : String(31242 * n())
                .replace('.', '')
                .slice(0, 8);
        var a = e() + '-' + t() + '-' + r() + '-' + i + '-' + e();
        return a ? a : (String(n()) + String(n()) + String(n())).slice(2, 15);
      };
    })(),
    hi = function (e) {
      this.ele = e;
    },
    mi = function (e, t) {
      for (var r = []; e; e = e.nextSibling)
        1 === e.nodeType && e !== t && r.push(e);
      return r;
    };
  hi.prototype = {
    addClass: function (e) {
      var t = ' ' + this.ele.className + ' ';
      return (
        t.indexOf(' ' + e + ' ') === -1 &&
          (this.ele.className =
            this.ele.className + ('' === this.ele.className ? '' : ' ') + e),
        this
      );
    },
    removeClass: function (e) {
      var t = ' ' + this.ele.className + ' ';
      return (
        t.indexOf(' ' + e + ' ') !== -1 &&
          (this.ele.className = t.replace(' ' + e + ' ', ' ').slice(1, -1)),
        this
      );
    },
    hasClass: function (e) {
      var t = ' ' + this.ele.className + ' ';
      return t.indexOf(' ' + e + ' ') !== -1;
    },
    attr: function (e, t) {
      return 'string' == typeof e && h(t)
        ? this.ele.getAttribute(e)
        : ('string' == typeof e &&
            ((t = String(t)), this.ele.setAttribute(e, t)),
          this);
    },
    offset: function () {
      var e = this.ele.getBoundingClientRect();
      if (e.width || e.height) {
        var t = this.ele.ownerDocument,
          r = t.documentElement;
        return {
          top: e.top + window.pageYOffset - r.clientTop,
          left: e.left + window.pageXOffset - r.clientLeft,
        };
      }
      return { top: 0, left: 0 };
    },
    getSize: function () {
      if (!window.getComputedStyle)
        return { width: this.ele.offsetWidth, height: this.ele.offsetHeight };
      try {
        var e = this.ele.getBoundingClientRect();
        return { width: e.width, height: e.height };
      } catch (t) {
        return { width: 0, height: 0 };
      }
    },
    getStyle: function (e) {
      return this.ele.currentStyle
        ? this.ele.currentStyle[e]
        : this.ele.ownerDocument.defaultView
            .getComputedStyle(this.ele, null)
            .getPropertyValue(e);
    },
    wrap: function (e) {
      var t = document.createElement(e);
      return (
        this.ele.parentNode.insertBefore(t, this.ele),
        t.appendChild(this.ele),
        y(t)
      );
    },
    getCssStyle: function (e) {
      var t = this.ele.style.getPropertyValue(e);
      if (t) return t;
      var r = null;
      if (
        ('function' == typeof window.getMatchedCSSRules &&
          (r = window.getMatchedCSSRules(this.ele)),
        !r || !v(r))
      )
        return null;
      for (var n = r.length - 1; n >= 0; n--) {
        var i = r[n];
        if ((t = i.style.getPropertyValue(e))) return t;
      }
    },
    sibling: function (e, t) {
      for (; (e = e[t]) && 1 !== e.nodeType; );
      return e;
    },
    next: function () {
      return this.sibling(this.ele, 'nextSibling');
    },
    prev: function () {
      return this.sibling(this.ele, 'previousSibling');
    },
    siblings: function () {
      return mi((this.ele.parentNode || {}).firstChild, this.ele);
    },
    children: function () {
      return mi(this.ele.firstChild);
    },
    parent: function () {
      var e = this.ele.parentNode;
      return (e = e && 11 !== e.nodeType ? e : null), y(e);
    },
    previousElementSibling: function () {
      var e = this.ele;
      if ('previousElementSibling' in document.documentElement)
        return y(e.previousElementSibling);
      for (; (e = e.previousSibling); ) if (1 === e.nodeType) return y(e);
      return y(null);
    },
    getSameTypeSiblings: function () {
      for (
        var e = this.ele,
          t = e.parentNode,
          r = e.tagName.toLowerCase(),
          n = [],
          i = 0;
        i < t.children.length;
        i++
      ) {
        var a = t.children[i];
        1 === a.nodeType &&
          a.tagName.toLowerCase() === r &&
          n.push(t.children[i]);
      }
      return n;
    },
    getParents: function () {
      try {
        var e = this.ele;
        if (!g(e)) return [];
        var t = [e];
        if (null === e || null === e.parentElement) return [];
        for (; null !== e.parentElement; ) (e = e.parentElement), t.push(e);
        return t;
      } catch (r) {
        return [];
      }
    },
  };
  var vi = Array.prototype.forEach,
    yi = Object.prototype.hasOwnProperty,
    bi = Object.prototype.hasOwnProperty,
    wi = {
      get: function (e) {
        for (
          var t = e + '=', r = document.cookie.split(';'), n = 0;
          n < r.length;
          n++
        ) {
          for (var i = r[n]; ' ' == i.charAt(0); ) i = i.substring(1, i.length);
          if (0 == i.indexOf(t)) return u(i.substring(t.length, i.length));
        }
        return null;
      },
      set: function (e, t, r, n, i, a, s) {
        function o(e) {
          return !!e && e.replace(/\r\n/g, '');
        }
        var l = s,
          u = '',
          c = '',
          p = '';
        if (((r = null == r ? 73e3 : r), 0 !== r)) {
          var f = new Date();
          's' === String(r).slice(-1)
            ? f.setTime(f.getTime() + 1e3 * Number(String(r).slice(0, -1)))
            : f.setTime(f.getTime() + 24 * r * 60 * 60 * 1e3),
            (u = '; expires=' + f.toGMTString());
        }
        d(i) && '' !== i && (p = '; SameSite=' + i), a && (c = '; secure');
        var _ = '',
          g = '',
          h = '';
        e && (_ = o(e)),
          t && (g = o(t)),
          l && (h = o(l)),
          _ &&
            g &&
            (document.cookie =
              _ + '=' + encodeURIComponent(g) + u + '; path=/' + h + p + c);
      },
      remove: function (e, t) {
        this.set(e, '1', -1, t);
      },
      isSupport: function (e, t) {
        function r() {
          n.set(e, t);
          var r = n.get(e);
          return r === t && (n.remove(e), !0);
        }
        (e = e || 'cookie_support_test'), (t = t || '1');
        var n = this;
        return navigator.cookieEnabled && r();
      },
    },
    Si = Object.prototype.hasOwnProperty,
    ki = {
      isSupport: function () {
        var e = !0,
          t = '__session_storage_support__',
          r = 'testIsSupportStorage';
        try {
          sessionStorage && sessionStorage.setItem
            ? (sessionStorage.setItem(t, r),
              sessionStorage.removeItem(t, r),
              (e = !0))
            : (e = !1);
        } catch (n) {
          e = !1;
        }
        return e;
      },
    },
    Pi = { '+': '-', '/': '_', '=': '.' },
    Ci = { '-': '+', _: '/', '.': '=' },
    Ni = {
      encode: function (e) {
        return e.replace(/[+\/=]/g, function (e) {
          return Pi[e];
        });
      },
      decode: function (e) {
        return e.replace(/[-_.]/g, function (e) {
          return Ci[e];
        });
      },
      trim: function (e) {
        return e.replace(/[.=]{1,2}$/, '');
      },
      isBase64: function (e) {
        return /^[A-Za-z0-9+\/]*[=]{0,2}$/.test(e);
      },
      isUrlSafeBase64: function (e) {
        return /^[A-Za-z0-9_-]*[.]{0,2}$/.test(e);
      },
    },
    Oi = {
      __proto__: null,
      ConcurrentStorage: a,
      EventEmitter: l,
      URL: _,
      UUID: gi,
      addEvent: b,
      addHashEvent: w,
      ajax: C,
      base64Decode: O,
      base64Encode: j,
      bindReady: T,
      cookie: wi,
      coverExtend: I,
      decodeURI: $,
      decodeURIComponent: u,
      dfmapping: A,
      each: k,
      encodeDates: E,
      extend: P,
      extend2Lev: L,
      filter: U,
      formatDate: x,
      formatJsonString: R,
      getCookieTopLevelDomain: B,
      getDomBySelector: J,
      getElementContent: M,
      getHostname: q,
      getIOSVersion: K,
      getQueryParam: F,
      getQueryParamsFromUrl: V,
      getRandom: n,
      getRandomBasic: _i,
      getScreenOrientation: W,
      getUA: X,
      getURL: Z,
      getURLPath: G,
      getURLSearchParams: c,
      hasAttribute: Q,
      hasAttributes: Y,
      hashCode: ee,
      hashCode53: te,
      indexOf: re,
      inherit: ne,
      isArguments: ie,
      isArray: v,
      isBoolean: ae,
      isDate: D,
      isElement: g,
      isEmptyObject: se,
      isFunction: e,
      isHttpUrl: oe,
      isIOS: le,
      isJSONString: ue,
      isNumber: ce,
      isObject: r,
      isString: d,
      isSupportBeaconSend: de,
      isSupportCors: pe,
      isUndefined: h,
      jsonp: fe,
      listenPageState: _e,
      loadScript: ge,
      localStorage: fi,
      logger: pi,
      map: N,
      mediaQueriesSupported: z,
      now: t,
      removeScriptProtocol: he,
      rot13defs: ve,
      rot13obfs: me,
      ry: y,
      safeJSONParse: i,
      searchObjDate: ye,
      sessionStorage: ki,
      setCssStyle: be,
      strToUnicode: we,
      throttle: Se,
      toArray: Pe,
      trim: p,
      unique: Ce,
      urlParse: f,
      urlSafeBase64: Ni,
      values: ke,
      xhr: S,
    },
    ji = {},
    Ti = {
      preset_properties: {
        search_keyword_baidu: !1,
        latest_utm: !0,
        latest_traffic_source_type: !0,
        latest_search_keyword: !0,
        latest_referrer: !0,
        latest_referrer_host: !1,
        latest_landing_page: !1,
        latest_wx_ad_click_id: void 0,
        url: !0,
        title: !0,
      },
      encrypt_cookie: !1,
      enc_cookie: !1,
      img_use_crossorigin: !1,
      name: 'sa',
      max_referrer_string_length: 200,
      max_string_length: 500,
      max_id_length: 255,
      max_key_length: 100,
      cross_subdomain: !0,
      show_log: !1,
      is_debug: !1,
      source_channel: [],
      sdk_id: '',
      vtrack_ignore: {},
      auto_init: !0,
      is_track_single_page: !1,
      is_single_page: !1,
      batch_send: !1,
      source_type: {},
      callback_timeout: 200,
      datasend_timeout: 8e3,
      is_track_device_id: !1,
      ignore_oom: !0,
      app_js_bridge: !1,
    },
    Ii = 'utm_source utm_medium utm_campaign utm_content utm_term',
    $i = '1.25.2',
    Ai = 'sensorsdata_domain_test',
    Di = {
      EMAIL: '$identity_email',
      MOBILE: '$identity_mobile',
      LOGIN: '$identity_login_id',
    },
    xi = {
      get: function (e) {
        return wi.get(e);
      },
      set: function (e, t, r, n) {
        var i = '';
        if ((n = h(n) ? ji.cross_subdomain : n)) {
          var a = Te(location.href);
          'url\u89e3\u6790\u5931\u8d25' === a && (a = ''),
            (i = a ? '; domain=' + a : '');
        }
        return wi.set(
          e,
          t,
          r,
          n,
          ji.set_cookie_samesite,
          ji.is_secure_cookie,
          i,
        );
      },
      remove: function (e, t) {
        return (t = h(t) ? ji.cross_subdomain : t), wi.remove(e, t);
      },
      isSupport: function (e, t) {
        return (
          (e = e || 'sajssdk_2015_cookie_access_test'),
          (t = t || '1'),
          wi.isSupport(e, t)
        );
      },
    },
    Ei = {
      data: {},
      id: function () {
        return this.data.id
          ? this.data.id
          : ((this.data.id = Ae()), this.data.id);
      },
      type: function () {
        return this.data.type
          ? this.data.type
          : ((this.data.type = $e()), this.data.type);
      },
    },
    Li = {
      distinct_id: function () {},
      jssdkDebug: function () {},
      _sendDebug: function (e) {},
      apph5: function (e) {
        var t = 'app_h5\u6253\u901a\u5931\u8d25-',
          n = {
            1: t + 'use_app_track\u4e3afalse',
            2:
              t +
              'Android\u6216\u8005iOS\uff0c\u6ca1\u6709\u66b4\u9732\u76f8\u5e94\u65b9\u6cd5',
            3.1: t + 'Android\u6821\u9a8cserver_url\u5931\u8d25',
            3.2: t + 'iOS\u6821\u9a8cserver_url\u5931\u8d25',
            4.1: t + 'H5 \u6821\u9a8c iOS server_url \u5931\u8d25',
            4.2: t + 'H5 \u6821\u9a8c Android server_url \u5931\u8d25',
          },
          i = e.output,
          a = e.step,
          s = e.data || '';
        ('all' !== i && 'console' !== i) || Ne(n[a]),
          ('all' === i || 'code' === i) &&
            r(ji.is_debug) &&
            ji.is_debug.apph5 &&
            ((s.type && 'profile' === s.type.slice(0, 7)) ||
              (s.properties._jssdk_debug_info = 'apph5-' + String(a)));
      },
      defineMode: function (e) {
        var t = {
          1: {
            title:
              '\u5f53\u524d\u9875\u9762\u65e0\u6cd5\u8fdb\u884c\u53ef\u89c6\u5316\u5168\u57cb\u70b9',
            message:
              'App SDK \u4e0e Web JS SDK \u6ca1\u6709\u8fdb\u884c\u6253\u901a\uff0c\u8bf7\u8054\u7cfb\u8d35\u65b9\u6280\u672f\u4eba\u5458\u4fee\u6b63 App SDK \u7684\u914d\u7f6e\uff0c\u8be6\u7ec6\u4fe1\u606f\u8bf7\u67e5\u770b\u6587\u6863\u3002',
            link_text: '\u914d\u7f6e\u6587\u6863',
            link_url:
              'https://manual.sensorsdata.cn/sa/latest/tech_sdk_client_link-1573913.html',
          },
          2: {
            title:
              '\u5f53\u524d\u9875\u9762\u65e0\u6cd5\u8fdb\u884c\u53ef\u89c6\u5316\u5168\u57cb\u70b9',
            message:
              'App SDK \u4e0e Web JS SDK \u6ca1\u6709\u8fdb\u884c\u6253\u901a\uff0c\u8bf7\u8054\u7cfb\u8d35\u65b9\u6280\u672f\u4eba\u5458\u4fee\u6b63 Web JS SDK \u7684\u914d\u7f6e\uff0c\u8be6\u7ec6\u4fe1\u606f\u8bf7\u67e5\u770b\u6587\u6863\u3002',
            link_text: '\u914d\u7f6e\u6587\u6863',
            link_url:
              'https://manual.sensorsdata.cn/sa/latest/tech_sdk_client_link-1573913.html',
          },
          3: {
            title:
              '\u5f53\u524d\u9875\u9762\u65e0\u6cd5\u8fdb\u884c\u53ef\u89c6\u5316\u5168\u57cb\u70b9',
            message:
              'Web JS SDK \u6ca1\u6709\u5f00\u542f\u5168\u57cb\u70b9\u914d\u7f6e\uff0c\u8bf7\u8054\u7cfb\u8d35\u65b9\u5de5\u4f5c\u4eba\u5458\u4fee\u6b63 SDK \u7684\u914d\u7f6e\uff0c\u8be6\u7ec6\u4fe1\u606f\u8bf7\u67e5\u770b\u6587\u6863\u3002',
            link_text: '\u914d\u7f6e\u6587\u6863',
            link_url:
              'https://manual.sensorsdata.cn/sa/latest/tech_sdk_client_web_all-1573964.html',
          },
          4: {
            title:
              '\u5f53\u524d\u9875\u9762\u65e0\u6cd5\u8fdb\u884c\u53ef\u89c6\u5316\u5168\u57cb\u70b9',
            message:
              'Web JS SDK \u914d\u7f6e\u7684\u6570\u636e\u6821\u9a8c\u5730\u5740\u4e0e App SDK \u914d\u7f6e\u7684\u6570\u636e\u6821\u9a8c\u5730\u5740\u4e0d\u4e00\u81f4\uff0c\u8bf7\u8054\u7cfb\u8d35\u65b9\u5de5\u4f5c\u4eba\u5458\u4fee\u6b63 SDK \u7684\u914d\u7f6e\uff0c\u8be6\u7ec6\u4fe1\u606f\u8bf7\u67e5\u770b\u6587\u6863\u3002',
            link_text: '\u914d\u7f6e\u6587\u6863',
            link_url:
              'https://manual.sensorsdata.cn/sa/latest/tech_sdk_client_link-1573913.html',
          },
        };
        return !(!e || !t[e]) && t[e];
      },
      protocol: {
        protocolIsSame: function (e, t) {
          try {
            if (_(e).protocol !== _(t).protocol) return !1;
          } catch (r) {
            return Ne('\u4e0d\u652f\u6301 _.URL \u65b9\u6cd5'), !1;
          }
          return !0;
        },
        serverUrl: function () {
          d(ji.server_url) &&
            '' !== ji.server_url &&
            !this.protocolIsSame(ji.server_url, location.href) &&
            Ne(
              'SDK \u68c0\u6d4b\u5230\u60a8\u7684\u6570\u636e\u53d1\u9001\u5730\u5740\u548c\u5f53\u524d\u9875\u9762\u5730\u5740\u7684\u534f\u8bae\u4e0d\u4e00\u81f4\uff0c\u5efa\u8bae\u60a8\u4fee\u6539\u6210\u4e00\u81f4\u7684\u534f\u8bae\u3002\n\u56e0\u4e3a\uff1a1\u3001https \u4e0b\u9762\u53d1\u9001 http \u7684\u56fe\u7247\u8bf7\u6c42\u4f1a\u5931\u8d25\u30022\u3001http \u9875\u9762\u4f7f\u7528 https + ajax \u65b9\u5f0f\u53d1\u6570\u636e\uff0c\u5728 ie9 \u53ca\u4ee5\u4e0b\u4f1a\u4e22\u5931\u6570\u636e\u3002',
            );
        },
        ajax: function (e) {
          return (
            e !== ji.server_url &&
            void (
              d(e) &&
              '' !== e &&
              !this.protocolIsSame(e, location.href) &&
              Ne(
                'SDK \u68c0\u6d4b\u5230\u60a8\u7684\u6570\u636e\u53d1\u9001\u5730\u5740\u548c\u5f53\u524d\u9875\u9762\u5730\u5740\u7684\u534f\u8bae\u4e0d\u4e00\u81f4\uff0c\u5efa\u8bae\u60a8\u4fee\u6539\u6210\u4e00\u81f4\u7684\u534f\u8bae\u3002\u56e0\u4e3a http \u9875\u9762\u4f7f\u7528 https + ajax \u65b9\u5f0f\u53d1\u6570\u636e\uff0c\u5728 ie9 \u53ca\u4ee5\u4e0b\u4f1a\u4e22\u5931\u6570\u636e\u3002',
              )
            )
          );
        },
      },
    },
    Ui = {
      initPage: function () {
        var e = De(),
          t = Z(),
          r = Te(t);
        r || Li.jssdkDebug('url_domain\u5f02\u5e38_' + t + '_' + r),
          (this.pageProp = {
            referrer: e,
            referrer_host: e ? q(e) : '',
            url: t,
            url_host: q(t, 'url_host\u53d6\u503c\u5f02\u5e38'),
            url_domain: r,
          });
      },
      pageProp: {},
      campaignParams: function () {
        return ci.kit.getUtmData();
      },
      campaignParamsStandard: function (e, t) {
        (e = e || ''), (t = t || '');
        var r = Ui.campaignParams(),
          n = {},
          i = {};
        return (
          k(r, function (r, a, s) {
            (' ' + Ii + ' ').indexOf(' ' + a + ' ') !== -1
              ? (n[e + a] = s[a])
              : (i[t + a] = s[a]);
          }),
          { $utms: n, otherUtms: i }
        );
      },
      properties: function () {
        var e =
            window.innerHeight ||
            document.documentElement.clientHeight ||
            (document.body && document.body.clientHeight) ||
            0,
          t =
            window.innerWidth ||
            document.documentElement.clientWidth ||
            (document.body && document.body.clientWidth) ||
            0,
          r = {
            $timezone_offset: new Date().getTimezoneOffset(),
            $screen_height: Number(screen.height) || 0,
            $screen_width: Number(screen.width) || 0,
            $viewport_height: e,
            $viewport_width: t,
            $lib: 'js',
            $lib_version: $i,
          };
        return r;
      },
      currentProps: {},
      register: function (e) {
        P(Ui.currentProps, e);
      },
    };
  xi.getNewUser = Re;
  var Ri = {
      data: {},
      get: function (e) {
        var t = this.data[e];
        return void 0 === t
          ? null
          : void 0 !== t._expirationTimestamp_
          ? new Date().getTime() > t._expirationTimestamp_
            ? null
            : t.value
          : t;
      },
      set: function (e, t, r) {
        if (r) {
          var n,
            i = new Date();
          (n =
            's' === String(r).slice(-1)
              ? i.getTime() + 1e3 * Number(String(r).slice(0, -1))
              : i.getTime() + 24 * r * 60 * 60 * 1e3),
            (t = { value: t, _expirationTimestamp_: n });
        }
        this.data[e] = t;
      },
      getNewUserFlagMemoryKey: function (e) {
        return 'sajssdk_2015_' + ji.sdk_id + e;
      },
    },
    Hi = {
      checkIsAddSign: function (e) {
        'track' === e.type &&
          (Re()
            ? (e.properties.$is_first_day = !0)
            : (e.properties.$is_first_day = !1));
      },
      is_first_visit_time: !1,
      is_page_first_visited: !1,
      checkIsFirstTime: function (e) {
        'track' === e.type &&
          '$pageview' === e.event &&
          (this.is_first_visit_time
            ? ((e.properties.$is_first_time = !0),
              (this.is_first_visit_time = !1))
            : (e.properties.$is_first_time = !1));
      },
      setDeviceId: function (e, t) {
        var r = null,
          n = xi.get('sensorsdata2015jssdkcross' + ci.para.sdk_id);
        n = ci.kit.userDecryptIfNeeded(n);
        var i = {};
        null != n &&
          ue(n) &&
          ((i = JSON.parse(n)), i.$device_id && (r = i.$device_id)),
          (r = r || e),
          ci.para.cross_subdomain === !0
            ? t.set('$device_id', r)
            : ((i.$device_id = r),
              (i = JSON.stringify(i)),
              ci.para.encrypt_cookie && (i = ci.kit.userEncrypt(i)),
              xi.set(
                'sensorsdata2015jssdkcross' + ci.para.sdk_id,
                i,
                null,
                !0,
              )),
          ci.para.is_track_device_id && (Ui.currentProps.$device_id = r);
      },
      storeInitCheck: function () {
        if (ci.is_first_visitor) {
          var e = new Date(),
            t = {
              h: 23 - e.getHours(),
              m: 59 - e.getMinutes(),
              s: 59 - e.getSeconds(),
            };
          xi.isSupport()
            ? xi.set(Ue('new_user'), '1', 3600 * t.h + 60 * t.m + t.s + 's')
            : Ri.set(
                Ri.getNewUserFlagMemoryKey('new_user'),
                '1',
                3600 * t.h + 60 * t.m + t.s + 's',
              ),
            (this.is_first_visit_time = !0),
            (this.is_page_first_visited = !0);
        } else
          Re() ||
            (this.checkIsAddSign = function (e) {
              'track' === e.type && (e.properties.$is_first_day = !1);
            }),
            (this.checkIsFirstTime = function (e) {
              'track' === e.type &&
                '$pageview' === e.event &&
                (e.properties.$is_first_time = !1);
            });
      },
    },
    Bi = function () {
      (this._events = []), (this.pendingEvents = []);
    };
  Bi.prototype = {
    emit: function (e) {
      var t = [].slice.call(arguments, 1);
      k(this._events, function (r) {
        r.type === e && r.callback.apply(r.context, t);
      }),
        this.pendingEvents.push({ type: e, data: t }),
        this.pendingEvents.length > 20 ? this.pendingEvents.shift() : null;
    },
    on: function (t, r, n, i) {
      e(r) &&
        (this._events.push({ type: t, callback: r, context: n || this }),
        (i = i !== !1),
        this.pendingEvents.length > 0 &&
          i &&
          k(this.pendingEvents, function (e) {
            e.type === t && r.apply(n, e.data);
          }));
    },
    tempAdd: function (e, t) {
      if (t && e) return this.emit(e, t);
    },
    isReady: function () {},
  };
  var Ji = function (e) {
    (this.callback = e.callback),
      (this.server_url = e.server_url),
      (this.data = e.data);
  };
  (Ji.prototype.start = function () {
    var e = this;
    Ze({
      url: this.server_url,
      type: 'POST',
      data: this.data,
      credentials: !1,
      timeout: ji.datasend_timeout,
      cors: !0,
      success: function () {
        e.end();
      },
      error: function () {
        e.end();
      },
    });
  }),
    (Ji.prototype.end = function () {
      if (this.callback) {
        if ((Ne('warning: sdk callback is deprecated.'), !e(this.callback)))
          return void Ne('error: sdk callback must be function.');
        this.callback();
      }
    });
  var Mi = 'sawebjssdk-',
    qi = 'tab-sawebjssdk-';
  Ye.prototype = {
    batchInterval: function () {
      '' === this.serverUrl && this.getServerUrl(),
        this.hasTabStorage ||
          (this.generateTabStorage(), (this.hasTabStorage = !0));
      var e = this;
      e.timer = setTimeout(function () {
        e.updateExpireTime(),
          e.recycle(),
          e.send(),
          clearTimeout(e.timer),
          e.batchInterval();
      }, ji.batch_send.send_interval);
    },
    getServerUrl: function () {
      return (d(ji.server_url) && '' !== ji.server_url) ||
        (v(ji.server_url) && ji.server_url.length)
        ? void (this.serverUrl = v(ji.server_url)
            ? ji.server_url[0]
            : ji.server_url)
        : ci.log(
            '\u5f53\u524d server_url \u4e3a\u7a7a\u6216\u4e0d\u6b63\u786e\uff0c\u53ea\u5728\u63a7\u5236\u53f0\u6253\u5370\u65e5\u5fd7\uff0cnetwork \u4e2d\u4e0d\u4f1a\u53d1\u6570\u636e\uff0c\u8bf7\u914d\u7f6e\u6b63\u786e\u7684 server_url\uff01',
          );
    },
    send: function () {
      if (
        !(
          this.sendTimeStamp &&
          t() - this.sendTimeStamp < ji.batch_send.datasend_timeout
        )
      ) {
        var e = fi.get(this.tabKey);
        if (e) {
          (this.sendTimeStamp = t()),
            (e = i(e) || this.generateTabStorageVal());
          var r = Ce(e.data);
          if (r.length) {
            for (var n = [], a = 0; a < r.length; a++)
              n.push(ci.store.readObjectVal(r[a]));
            this.request(n, e.data);
          }
        }
      }
    },
    updateExpireTime: function () {
      var e = fi.get(this.tabKey);
      e &&
        ((e = i(e) || this.generateTabStorageVal()),
        (e.expireTime = t() + 2 * ji.batch_send.send_interval),
        (e.serverUrl = this.serverUrl),
        fi.set(this.tabKey, JSON.stringify(e)));
    },
    request: function (e, t) {
      var r = this;
      Ze({
        url: this.serverUrl,
        type: 'POST',
        data: 'data_list=' + encodeURIComponent(j(JSON.stringify(e))),
        credentials: !1,
        timeout: ji.batch_send.datasend_timeout,
        cors: !0,
        success: function () {
          r.remove(t), (r.sendTimeStamp = 0);
        },
        error: function () {
          r.sendTimeStamp = 0;
        },
      });
    },
    remove: function (e) {
      var t = fi.get(this.tabKey);
      if (t) {
        for (
          var r = (i(t) || this.generateTabStorageVal()).data, n = 0;
          n < e.length;
          n++
        ) {
          var a = re(r, e[n]);
          a > -1 && r.splice(a, 1), fi.remove(e[n]);
        }
        (r = Ce(r)),
          fi.set(this.tabKey, JSON.stringify(this.generateTabStorageVal(r)));
      }
    },
    add: function (e) {
      var r = Mi + String(n()),
        a = fi.get(this.tabKey);
      null === a
        ? ((this.tabKey = qi + String(n())), (a = this.generateTabStorageVal()))
        : (a = i(a) || this.generateTabStorageVal()),
        a.data.push(r),
        (a.expireTime = t() + 2 * ji.batch_send.send_interval),
        fi.set(this.tabKey, JSON.stringify(a)),
        ci.store.saveObjectVal(r, e),
        ('track_signup' !== e.type && '$pageview' !== e.event) ||
          this.sendImmediately();
    },
    generateTabStorage: function () {
      (this.tabKey = qi + String(n())),
        fi.set(this.tabKey, JSON.stringify(this.generateTabStorageVal()));
    },
    generateTabStorageVal: function (e) {
      return (
        (e = e || []),
        {
          data: e,
          expireTime: t() + 2 * ji.batch_send.send_interval,
          serverUrl: this.serverUrl,
        }
      );
    },
    sendImmediately: function () {
      this.send();
    },
    recycle: function () {
      for (
        var e = {}, r = 1e4, n = 'sajssdk-lock-get-', s = 0;
        s < localStorage.length;
        s++
      ) {
        var o = localStorage.key(s),
          l = this;
        if (0 === o.indexOf(qi)) {
          for (
            var u = i(fi.get(o)) || this.generateTabStorageVal(), c = 0;
            c < u.data.length;
            c++
          )
            e[u.data[c]] = !0;
          if (
            o !== l.tabKey &&
            t() > u.expireTime &&
            this.serverUrl === u.serverUrl
          ) {
            var d = new a(n);
            d.get(o, r, 1e3, function (e) {
              if (e) {
                null === fi.get(l.tabKey) && l.generateTabStorage();
                var t = i(e) || l.generateTabStorageVal(),
                  r = i(fi.get(l.tabKey)) || l.generateTabStorageVal();
                (r.data = Ce(r.data.concat(t.data))),
                  fi.set(l.tabKey, JSON.stringify(r));
              }
            });
          }
        } else if (0 === o.indexOf(n)) {
          var p = i(fi.get(o)) || { expireTime: 0 };
          t() - p.expireTime > r && fi.remove(o);
        }
      }
      for (var f = 0; f < localStorage.length; f++) {
        var _ = localStorage.key(f);
        0 !== _.indexOf(Mi) || e[_] || fi.remove(_);
      }
    },
  };
  var Ki = function (e) {
    (this.callback = e.callback),
      (this.server_url = e.server_url),
      (this.data = e.data);
  };
  (Ki.prototype.start = function () {
    var e = this;
    'object' == typeof navigator &&
      'function' == typeof navigator.sendBeacon &&
      navigator.sendBeacon(this.server_url, this.data),
      setTimeout(function () {
        e.end();
      }, 40);
  }),
    (Ki.prototype.end = function () {
      if (this.callback) {
        if ((Ne('warning: sdk callback is deprecated.'), !e(this.callback)))
          return void Ne('error: sdk callback must be function.');
        this.callback();
      }
    });
  var Vi = function (e) {
    (this.callback = e.callback),
      (this.img = document.createElement('img')),
      (this.img.width = 1),
      (this.img.height = 1),
      ji.img_use_crossorigin && (this.img.crossOrigin = 'anonymous'),
      (this.server_url = e.data);
  };
  (Vi.prototype.start = function () {
    var e = this;
    ji.ignore_oom &&
      ((this.img.onload = function () {
        (this.onload = null),
          (this.onerror = null),
          (this.onabort = null),
          e.end();
      }),
      (this.img.onerror = function () {
        (this.onload = null),
          (this.onerror = null),
          (this.onabort = null),
          e.end();
      }),
      (this.img.onabort = function () {
        (this.onload = null),
          (this.onerror = null),
          (this.onabort = null),
          e.end();
      })),
      (this.img.src = this.server_url);
  }),
    (Vi.prototype.lastClear = function () {
      var e = X();
      void 0 !== e.ie ? (this.img.src = 'about:blank') : (this.img.src = '');
    }),
    (Vi.prototype.end = function () {
      if (this.callback) {
        if ((Ne('warning: sdk callback is deprecated.'), !e(this.callback)))
          return void Ne('error: sdk callback must be function.');
        this.callback();
      }
      var t = this;
      setTimeout(function () {
        t.lastClear && t.lastClear();
      }, ji.datasend_timeout - ji.callback_timeout);
    });
  var Fi = {
      __proto__: null,
      addEvent: He,
      EventEmitterSa: Bi,
      cookie: xi,
      info: Ui,
      getReferrer: De,
      getCurrentDomain: Te,
      isBaiduTraffic: Ie,
      getReferrerEqid: Ae,
      getReferrerEqidType: $e,
      getBaiduKeyword: Ei,
      isReferralTraffic: xe,
      getKeywordFromReferrer: Ee,
      getReferSearchEngine: Le,
      getSourceFromReferrer: Be,
      getWxAdIdFromUrl: Je,
      parseSuperProperties: Me,
      searchConfigData: qe,
      strip_empty_properties: Ke,
      getEleInfo: ze,
      getElementContent: Xe,
      ajax: Ze,
      optimizeServerUrl: Ge,
      encodeTrackData: Qe,
      AjaxSend: Ji,
      BatchSend: Ye,
      BeaconSend: Ki,
      ImageSend: Vi,
    },
    zi = new Bi(),
    Wi = {
      requests: [],
      _sessionState: {},
      _state: { distinct_id: '', first_id: '', props: {}, identities: {} },
      getProps: function () {
        return this._state.props || {};
      },
      getSessionProps: function () {
        return this._sessionState;
      },
      getOriginDistinctId: function () {
        return this._state._distinct_id || this._state.distinct_id;
      },
      getOriginUnionId: function (e) {
        var t = {};
        e = e || this._state;
        var r = e._first_id || e.first_id,
          n = e._distinct_id || e.distinct_id;
        return (
          r && n
            ? ((t.login_id = n), (t.anonymous_id = r))
            : (t.anonymous_id = n),
          t
        );
      },
      getDistinctId: function () {
        var e = this.getUnionId();
        return e.login_id || e.anonymous_id;
      },
      getUnionId: function (e) {
        var t = this.getOriginUnionId(e);
        return (
          t.login_id &&
            this._state.history_login_id &&
            this._state.history_login_id.name &&
            this._state.history_login_id.name !== Di.LOGIN &&
            (t.login_id = this._state.history_login_id.name + '+' + t.login_id),
          t
        );
      },
      getFirstId: function () {
        return this._state._first_id || this._state.first_id;
      },
      initSessionState: function () {
        var e = xi.get('sensorsdata2015session');
        e = ci.kit.userDecryptIfNeeded(e);
        var t = null;
        null !== e &&
          'object' == typeof (t = i(e)) &&
          (this._sessionState = t || {});
      },
      setOnce: function (e, t) {
        e in this._state || this.set(e, t);
      },
      set: function (e, t) {
        this._state = this._state || {};
        var r = this._state.distinct_id;
        (this._state[e] = t),
          'first_id' === e
            ? delete this._state._first_id
            : 'distinct_id' === e && delete this._state._distinct_id,
          this.save(),
          'distinct_id' === e && r && zi.tempAdd('changeDistinctId', t);
      },
      change: function (e, t) {
        this._state['_' + e] = t;
      },
      setSessionProps: function (e) {
        ci.log(
          'initSessionState \u65b9\u6cd5\u5df2\u7ecf\u5f03\u7528\uff0c\u8bf7\u4e0d\u8981\u4f7f\u7528\u8be5\u529f\u80fd\uff0c\u5982\u6709\u9700\u6c42\u8054\u7cfb\u6280\u672f\u987e\u95ee',
        );
        var t = this._sessionState;
        P(t, e), this.sessionSave(t);
      },
      setSessionPropsOnce: function (e) {
        ci.log(
          'initSessionState \u65b9\u6cd5\u5df2\u7ecf\u5f03\u7528\uff0c\u8bf7\u4e0d\u8981\u4f7f\u7528\u8be5\u529f\u80fd\uff0c\u5982\u6709\u9700\u6c42\u8054\u7cfb\u6280\u672f\u987e\u95ee',
        );
        var t = this._sessionState;
        I(t, e), this.sessionSave(t);
      },
      setProps: function (e, t) {
        var r = {};
        r = t ? e : P(this._state.props || {}, e);
        for (var n in r)
          'string' == typeof r[n] &&
            (r[n] = r[n].slice(0, ci.para.max_referrer_string_length));
        this.set('props', r);
      },
      setPropsOnce: function (e) {
        var t = this._state.props || {};
        I(t, e), this.set('props', t);
      },
      clearAllProps: function (e) {
        this._sessionState = {};
        var t;
        if (v(e) && e.length > 0)
          for (t = 0; t < e.length; t++)
            d(e[t]) &&
              e[t].indexOf('latest_') === -1 &&
              r(this._state.props) &&
              e[t] in this._state.props &&
              delete this._state.props[e[t]];
        else if (r(this._state.props))
          for (t in this._state.props)
            1 !== t.indexOf('latest_') && delete this._state.props[t];
        this.sessionSave({}), this.save();
      },
      sessionSave: function (e) {
        ci.log(
          'initSessionState \u65b9\u6cd5\u5df2\u7ecf\u5f03\u7528\uff0c\u8bf7\u4e0d\u8981\u4f7f\u7528\u8be5\u529f\u80fd\uff0c\u5982\u6709\u9700\u6c42\u8054\u7cfb\u6280\u672f\u987e\u95ee',
        ),
          (this._sessionState = e);
        var t = JSON.stringify(this._sessionState);
        ci.para.encrypt_cookie && (t = ci.kit.userEncrypt(t)),
          xi.set('sensorsdata2015session', t, 0);
      },
      save: function () {
        var e = JSON.parse(JSON.stringify(this._state));
        delete e._first_id,
          delete e._distinct_id,
          e.identities && (e.identities = j(JSON.stringify(e.identities)));
        var t = JSON.stringify(e);
        ci.para.encrypt_cookie && (t = ci.kit.userEncrypt(t)),
          xi.set(this.getCookieName(), t, 73e3, ci.para.cross_subdomain);
      },
      getCookieName: function () {
        var e = '';
        if (ci.para.cross_subdomain === !1) {
          try {
            e = _(location.href).hostname;
          } catch (t) {
            ci.log(t);
          }
          e =
            'string' == typeof e && '' !== e
              ? 'sa_jssdk_2015_' + ci.para.sdk_id + e.replace(/\./g, '_')
              : 'sa_jssdk_2015_root' + ci.para.sdk_id;
        } else e = 'sensorsdata2015jssdkcross' + ci.para.sdk_id;
        return e;
      },
      init: function () {
        function e(e) {
          var t;
          e.identities &&
            (0 === e.identities.indexOf('\n/')
              ? (e.identities = i(ve(e.identities)))
              : (e.identities = i(O(e.identities))));
          var n = Wi.getOriginUnionId(e);
          (e.identities && r(e.identities) && !se(e.identities)) ||
            ((e.identities = {}), (e.identities.$identity_cookie_id = gi())),
            (e.history_login_id = e.history_login_id || {});
          var a = e.history_login_id,
            s = a.name;
          if (n.login_id)
            if (s && e.identities.hasOwnProperty(s)) {
              if (e.identities[s] !== n.login_id) {
                e.identities[s] = n.login_id;
                for (t in e.identities)
                  e.identities.hasOwnProperty(t) &&
                    '$identity_cookie_id' !== t &&
                    t !== s &&
                    delete e.identities[t];
                e.history_login_id.value = n.login_id;
              }
            } else {
              var o = s || Di.LOGIN;
              e.identities[o] = n.login_id;
              for (t in e.identities)
                e.identities.hasOwnProperty(t) &&
                  '$identity_cookie_id' !== t &&
                  t !== o &&
                  delete e.identities[t];
              e.history_login_id = { name: o, value: n.login_id };
            }
          else {
            if (
              e.identities.hasOwnProperty('$identity_login_id') ||
              e.identities.hasOwnProperty(s)
            )
              for (t in e.identities)
                e.identities.hasOwnProperty(t) &&
                  '$identity_cookie_id' !== t &&
                  '$identity_anonymous_id' !== t &&
                  delete e.identities[t];
            e.history_login_id = { name: '', value: '' };
          }
          return e;
        }
        function t(e) {
          Wi.set('distinct_id', e),
            Wi.set('identities', { $identity_cookie_id: e }),
            Wi.set('history_login_id', { name: '', value: '' });
        }
        this.initSessionState();
        var n,
          a,
          s = gi();
        xi.isSupport() &&
          ((n = xi.get(this.getCookieName())),
          (n = ci.kit.userDecryptIfNeeded(n)),
          (a = i(n))),
          xi.isSupport() &&
          null !== n &&
          ue(n) &&
          r(a) &&
          (!r(a) || a.distinct_id)
            ? ((Wi._state = P(e(a))), Wi.save())
            : ((ci.is_first_visitor = !0), t(s)),
          Hi.setDeviceId(s, this),
          Hi.storeInitCheck();
      },
      saveObjectVal: function (e, t) {
        d(t) || (t = JSON.stringify(t)),
          1 == ci.para.encrypt_cookie && (t = ci.kit.userEncrypt(t)),
          fi.set(e, t);
      },
      readObjectVal: function (e) {
        var t = fi.get(e);
        return t ? ((t = ci.kit.userDecryptIfNeeded(t)), i(t)) : null;
      },
    },
    Xi = {
      string: function (e) {
        Ne(e + ' must be string');
      },
      emptyString: function (e) {
        Ne(e + "'s is empty");
      },
      regexTest: function (e) {
        Ne(e + ' is invalid');
      },
      idLength: function (e) {
        Ne(e + ' length is longer than ' + ji.max_id_length);
      },
      keyLength: function (e) {
        Ne(e + ' length is longer than ' + ji.max_key_length);
      },
      stringLength: function (e) {
        Ne(e + ' length is longer than ' + ji.max_string_length);
      },
      voidZero: function (e) {
        Ne(e + "'s is undefined");
      },
      reservedLoginId: function (e) {
        Ne(e + ' is invalid');
      },
      reservedBind: function (e) {
        Ne(e + ' is invalid');
      },
      reservedUnbind: function (e) {
        Ne(e + ' is invalid');
      },
    },
    Zi = {
      regName:
        /^((?!^distinct_id$|^original_id$|^time$|^properties$|^id$|^first_id$|^second_id$|^users$|^events$|^event$|^user_id$|^date$|^datetime$|^user_tag.*|^user_group.*)[a-zA-Z_$][a-zA-Z\d_$]*)$/i,
      loginIDReservedNames: ['$identity_anonymous_id', '$identity_cookie_id'],
      bindReservedNames: [
        '$identity_login_id',
        '$identity_anonymous_id',
        '$identity_cookie_id',
      ],
      unbindReservedNames: ['$identity_anonymous_id', Di.LOGIN],
      string: function (e) {
        return !!d(e);
      },
      emptyString: function (e) {
        return !(!d(e) || 0 === p(e).length);
      },
      regexTest: function (e) {
        return !(!d(e) || !this.regName.test(e));
      },
      idLength: function (e) {
        return !(!d(e) || e.length > ji.max_id_length);
      },
      keyLength: function (e) {
        return !(!d(e) || e.length > ji.max_key_length);
      },
      stringLength: function (e) {
        return !(!d(e) || e.length > ji.max_string_length);
      },
      voidZero: function (e) {
        return void 0 !== e;
      },
      reservedLoginId: function (e) {
        return !(re(this.loginIDReservedNames, e) > -1);
      },
      reservedUnbind: function (e) {
        return !(re(this.unbindReservedNames, e) > -1);
      },
      reservedBind: function (e) {
        var t = Wi._state.history_login_id;
        return !(
          (t && t.name && t.name === e) ||
          re(this.bindReservedNames, e) > -1
        );
      },
    },
    Gi = {
      distinct_id: {
        rules: ['string', 'emptyString', 'idLength'],
        onComplete: function (t, r, n) {
          return (
            (!t &&
              ('emptyString' === n && (r = 'Id'),
              e(Xi[n]) && Xi[n](r),
              'idLength' === n)) ||
            t
          );
        },
      },
      event: {
        rules: ['string', 'emptyString', 'keyLength', 'regexTest'],
        onComplete: function (t, r, n) {
          return (
            t ||
              ('emptyString' === n && (r = 'eventName'), e(Xi[n]) && Xi[n](r)),
            !0
          );
        },
      },
      propertyKey: {
        rules: ['string', 'emptyString', 'keyLength', 'regexTest'],
        onComplete: function (t, r, n) {
          return (
            t ||
              ('emptyString' === n && (r = 'Property key'),
              e(Xi[n]) && Xi[n](r)),
            !0
          );
        },
      },
      propertyValue: {
        rules: ['voidZero'],
        onComplete: function (t, r, n) {
          return t || ((r = 'Property Value'), e(Xi[n]) && Xi[n](r)), !0;
        },
      },
      properties: function (t) {
        return (
          r(t)
            ? k(t, function (t, r) {
                et({ propertyKey: r });
                var n = function (t, n, i) {
                  return t || ((n = r + "'s Value"), e(Xi[i]) && Xi[i](n)), !0;
                };
                et({ propertyValue: t }, n);
              })
            : Zi.voidZero(t) &&
              Ne(
                'properties\u53ef\u4ee5\u6ca1\u6709\uff0c\u4f46\u6709\u7684\u8bdd\u5fc5\u987b\u662f\u5bf9\u8c61',
              ),
          !0
        );
      },
      propertiesMust: function (e) {
        return (
          void 0 !== e && r(e) && !se(e)
            ? this.properties.call(this, e)
            : Ne('properties\u5fc5\u987b\u662f\u5bf9\u8c61'),
          !0
        );
      },
      item_type: {
        rules: ['string', 'emptyString', 'keyLength', 'regexTest'],
        onComplete: function (t, r, n) {
          return (
            t ||
              ('emptyString' === n && (r = 'item_type'), e(Xi[n]) && Xi[n](r)),
            !0
          );
        },
      },
      item_id: {
        rules: ['string', 'emptyString', 'stringLength'],
        onComplete: function (t, r, n) {
          return (
            t || ('emptyString' === n && (r = 'item_id'), e(Xi[n]) && Xi[n](r)),
            !0
          );
        },
      },
      loginIdKey: {
        rules: [
          'string',
          'emptyString',
          'keyLength',
          'regexTest',
          'reservedLoginId',
        ],
        onComplete: function (t, r, n) {
          return (
            (!t &&
              ('emptyString' === n && (r = 'login_id_key'),
              e(Xi[n]) && Xi[n](r),
              'keyLength' === n)) ||
            t
          );
        },
      },
      bindKey: {
        rules: [
          'string',
          'emptyString',
          'keyLength',
          'regexTest',
          'reservedBind',
        ],
        onComplete: function (t, r, n) {
          return (
            (!t &&
              ('emptyString' === n && (r = 'Key'),
              e(Xi[n]) && Xi[n](r),
              'keyLength' === n)) ||
            t
          );
        },
      },
      unbindKey: {
        rules: [
          'string',
          'emptyString',
          'keyLength',
          'regexTest',
          'reservedUnbind',
        ],
        onComplete: function (t, r, n) {
          return (
            (!t &&
              ('emptyString' === n && (r = 'Key'),
              e(Xi[n]) && Xi[n](r),
              'keyLength' === n)) ||
            t
          );
        },
      },
      bindValue: {
        rules: ['string', 'emptyString', 'idLength'],
        onComplete: function (t, r, n) {
          return (
            (!t &&
              ('emptyString' === n && (r = 'Value'),
              e(Xi[n]) && Xi[n](r),
              'idLength' === n)) ||
            t
          );
        },
      },
      check: function (t, r, n) {
        var i = this[t];
        if (e(i)) return i.call(this, r);
        if (!i) return !1;
        for (var a = 0; a < i.rules.length; a++) {
          var s = i.rules[a],
            o = Zi[s](r),
            l = e(n) ? n(o, r, s) : i.onComplete(o, r, s);
          if (!o) return l;
        }
        return !0;
      },
    },
    Qi = {};
  (Qi.initUrl = function () {
    var e,
      t = {
        server_url: { project: '', host: '' },
        page_url: { host: '', pathname: '' },
      };
    if (!oe(ci.para.server_url))
      return (
        ci.log(
          '----vcollect---server_url\u5fc5\u987b\u4e3a\u6709\u6548 URL \u5b57\u7b26\u4e32',
        ),
        !1
      );
    try {
      (e = _(ci.para.server_url)),
        (t.server_url.project = e.searchParams.get('project') || 'default'),
        (t.server_url.host = e.host);
    } catch (r) {
      return ci.log('----vcollect---server_url\u89e3\u6790\u5f02\u5e38', r), !1;
    }
    var n;
    try {
      (n = _(location.href)),
        (t.page_url.host = n.hostname),
        (t.page_url.pathname = n.pathname);
    } catch (r) {
      return (
        ci.log(
          '----vcollect---\u9875\u9762\u5730\u5740\u89e3\u6790\u5f02\u5e38',
          r,
        ),
        !1
      );
    }
    return t;
  }),
    (Qi.isDiv = function (e) {
      if (e.element_path) {
        var t = e.element_path.split('>'),
          r = p(t.pop());
        if ('div' !== r.slice(0, 3)) return !1;
      }
      return !0;
    }),
    (Qi.configIsMatchNew = function (e, t) {
      if (d(e.$element_selector) && d(t.element_selector)) {
        if ('element_selector' === t.element_field && 'equal' === t['function'])
          return e.$element_selector === t.element_selector;
        if (
          'element_selector' === t.element_field &&
          'contain' === t['function']
        )
          return e.$element_selector.indexOf(t.element_selector) > -1;
      }
      if (d(e.$element_path) && d(t.element_path)) {
        if ('element_path' === t.element_field && 'equal' === t['function'])
          return e.$element_path === t.element_path;
        if ('element_path' === t.element_field && 'contain' === t['function'])
          return e.$element_path.indexOf(t.element_path) > -1;
      }
      return !1;
    }),
    (Qi.configIsMatch = function (e, t) {
      return (
        (!t.limit_element_content ||
          t.element_content === e.$element_content) &&
        (!t.limit_element_position ||
          t.element_position === String(e.$element_position)) &&
        (t.element_field && t['function']
          ? Qi.configIsMatchNew(e, t)
          : Qi.configIsMatchOldVersion(e, t))
      );
    }),
    (Qi.configIsMatchOldVersion = function (e, t) {
      if (!t.element_path) return !1;
      if (void 0 !== e.$element_position) {
        if (t.element_path !== e.$element_path) return !1;
      } else if (Qi.isDiv({ element_path: t.element_path })) {
        if (e.$element_path.indexOf(t.element_path) < 0) return !1;
      } else if (t.element_path !== e.$element_path) return !1;
      return !0;
    }),
    (Qi.filterConfig = function (e, t, n) {
      var i = [];
      if (!n) {
        var a = Qi.initUrl();
        if (!a) return [];
        n = a.page_url;
      }
      return (
        '$WebClick' === e.event &&
          k(t, function (t) {
            r(t) &&
              ('webclick' === t.event_type || 'appclick' === t.event_type) &&
              r(t.event) &&
              t.event.url_host === n.host &&
              t.event.url_path === n.pathname &&
              Qi.configIsMatch(e.properties, t.event) &&
              i.push(t);
          }),
        i
      );
    }),
    (Qi.getPropElInLi = function (e, t) {
      if (!(e && g(e) && d(t))) return null;
      if ('li' !== e.tagName.toLowerCase()) return null;
      var r,
        n = ci.heatmap.getDomSelector(e);
      if (n) {
        r = n + t;
        var i = J(r);
        return i ? i : null;
      }
      return (
        ci.log(
          '----custom---\u83b7\u53d6\u540c\u7ea7\u5c5e\u6027\u5143\u7d20\u5931\u8d25\uff0cselector\u4fe1\u606f\u5f02\u5e38',
          n,
          t,
        ),
        null
      );
    }),
    (Qi.getProp = function (e, t) {
      if (!r(e)) return !1;
      if (!(d(e.name) && e.name.length > 0))
        return (
          ci.log(
            '----vcustom----\u5c5e\u6027\u540d\u4e0d\u5408\u6cd5,\u5c5e\u6027\u629b\u5f03',
            e.name,
          ),
          !1
        );
      var n,
        i,
        a = {};
      if ('content' === e.method) {
        var s;
        if (d(e.element_selector) && e.element_selector.length > 0)
          s = J(e.element_selector);
        else {
          if (!t || !d(e.list_selector))
            return (
              ci.log(
                '----vcustom----\u5c5e\u6027\u914d\u7f6e\u5f02\u5e38\uff0c\u5c5e\u6027\u629b\u5f03',
                e.name,
              ),
              !1
            );
          var o = J(t.properties.$element_selector);
          if (!o)
            return (
              ci.log(
                '----vcustom----\u70b9\u51fb\u5143\u7d20\u83b7\u53d6\u5f02\u5e38\uff0c\u5c5e\u6027\u629b\u5f03',
                e.name,
              ),
              !1
            );
          var l = ci.heatmap.getClosestLi(o);
          s = Qi.getPropElInLi(l, e.list_selector);
        }
        if (!s || !g(s))
          return (
            ci.log(
              '----vcustom----\u5c5e\u6027\u5143\u7d20\u83b7\u53d6\u5931\u8d25\uff0c\u5c5e\u6027\u629b\u5f03',
              e.name,
            ),
            !1
          );
        if ('input' === s.tagName.toLowerCase()) n = s.value || '';
        else if ('select' === s.tagName.toLowerCase()) {
          var u = s.selectedIndex;
          ce(u) && g(s[u]) && (n = Xe(s[u], 'select'));
        } else n = Xe(s, s.tagName.toLowerCase());
        if (e.regular) {
          try {
            i = new RegExp(e.regular).exec(n);
          } catch (c) {
            return (
              ci.log(
                '----vcustom----\u6b63\u5219\u5904\u7406\u5931\u8d25\uff0c\u5c5e\u6027\u629b\u5f03',
                e.name,
              ),
              !1
            );
          }
          if (null === i)
            return (
              ci.log(
                '----vcustom----\u5c5e\u6027\u89c4\u5219\u5904\u7406\uff0c\u672a\u5339\u914d\u5230\u7ed3\u679c,\u5c5e\u6027\u629b\u5f03',
                e.name,
              ),
              !1
            );
          if (!v(i) || !d(i[0]))
            return (
              ci.log(
                '----vcustom----\u6b63\u5219\u5904\u7406\u5f02\u5e38\uff0c\u5c5e\u6027\u629b\u5f03',
                e.name,
                i,
              ),
              !1
            );
          n = i[0];
        }
        if ('STRING' === e.type) a[e.name] = n;
        else if ('NUMBER' === e.type) {
          if (n.length < 1)
            return (
              ci.log(
                '----vcustom----\u672a\u83b7\u53d6\u5230\u6570\u5b57\u5185\u5bb9\uff0c\u5c5e\u6027\u629b\u5f03',
                e.name,
                n,
              ),
              !1
            );
          if (isNaN(Number(n)))
            return (
              ci.log(
                '----vcustom----\u6570\u5b57\u7c7b\u578b\u5c5e\u6027\u8f6c\u6362\u5931\u8d25\uff0c\u5c5e\u6027\u629b\u5f03',
                e.name,
                n,
              ),
              !1
            );
          a[e.name] = Number(n);
        }
        return a;
      }
      return (
        ci.log(
          '----vcustom----\u5c5e\u6027\u4e0d\u652f\u6301\u6b64\u83b7\u53d6\u65b9\u5f0f',
          e.name,
          e.method,
        ),
        !1
      );
    }),
    (Qi.getAssignConfigs = function (e, t) {
      var n = Qi.initUrl();
      if (!n || !n.page_url) return [];
      if (!r(t)) return [];
      var i = [];
      return (
        (t.events = t.events || t.eventList),
        v(t.events) && t.events.length > 0
          ? (k(t.events, function (t) {
              r(t) &&
                r(t.event) &&
                t.event.url_host === n.page_url.host &&
                t.event.url_path === n.page_url.pathname &&
                e(t) &&
                i.push(t);
            }),
            i)
          : []
      );
    });
  var Yi = {
      events: [],
      getAssignConfigs: Qi.getAssignConfigs,
      filterConfig: Qi.filterConfig,
      getProp: Qi.getProp,
      initUrl: Qi.initUrl,
      updateEvents: function (e) {
        v(e) && (this.events = e);
      },
      init: function () {
        this.initAppGetPropsBridge();
      },
      geth5Props: function (e) {
        var t = {},
          n = [],
          i = this;
        if (!this.events.length) return {};
        if ('$WebClick' === e.event) {
          var a = this.filterConfig(e, this.events);
          if (!a.length) return {};
          k(a, function (a) {
            r(a) &&
              (v(a.properties) &&
                a.properties.length > 0 &&
                k(a.properties, function (n) {
                  if (r(n))
                    if (n.h5 === !1)
                      v(t.sensorsdata_app_visual_properties) ||
                        (t.sensorsdata_app_visual_properties = []),
                        t.sensorsdata_app_visual_properties.push(n);
                    else {
                      var a = i.getProp(n, e);
                      r(a) && (t = P(t, a));
                    }
                }),
              d(a.event_name) && n.push(a.event_name));
          }),
            ci.bridge.hasVisualModeBridge() &&
              (t.sensorsdata_web_visual_eventName = n);
        }
        return (
          t.sensorsdata_app_visual_properties &&
            (t.sensorsdata_app_visual_properties = j(
              JSON.stringify(t.sensorsdata_app_visual_properties),
            )),
          t
        );
      },
      initAppGetPropsBridge: function () {
        var e = this,
          t = new ci.SDKJSBridge('getJSVisualProperties');
        return (
          t.onAppNotify(function (n) {
            var i = {};
            try {
              n = JSON.parse(O(n));
            } catch (a) {
              ci.log('getJSVisualProperties data parse error!');
            }
            if (r(n)) {
              var s = n.sensorsdata_js_visual_properties,
                o = e.initUrl();
              o &&
                ((o = o.page_url),
                v(s) &&
                  s.length > 0 &&
                  k(s, function (t) {
                    if (
                      r(t) &&
                      t.url_host === o.host &&
                      t.url_path === o.pathname &&
                      t.h5
                    ) {
                      var n = e.getProp(t);
                      r(n) && (i = P(i, n));
                    }
                  }));
            }
            var l = ci.bridge.bridge_info.platform;
            return 'android' === l && t.notifyApp({ data: i }, n.message_id), i;
          }),
          t
        );
      },
    },
    ea = {
      events: [],
      customProp: Yi,
      getAssignConfigs: Qi.getAssignConfigs,
      initUrl: Qi.initUrl,
      init: function () {
        if (this.initUrl()) {
          var e = this.getConfigFromApp();
          e && this.updateConfigs(e),
            this.customProp.init(),
            this.initAppUpdateConfigBridge();
        }
      },
      initAppUpdateConfigBridge: function () {
        var e = this;
        return new ci.SDKJSBridge('updateH5VisualConfig').onAppNotify(function (
          t,
        ) {
          if (t) {
            try {
              t = JSON.parse(O(t));
            } catch (r) {
              return void ci.log(
                'updateH5VisualConfig result parse error\uff01',
              );
            }
            e.updateConfigs(t);
          }
        });
      },
      getConfigFromApp: function () {
        var e = new ci.SDKJSBridge(
          'sensorsdata_get_app_visual_config',
        ).notifyApp();
        if (e)
          try {
            e = JSON.parse(O(e));
          } catch (t) {
            (e = null), ci.log('getAppVisualConfig result parse error\uff01');
          }
        return e;
      },
      updateConfigs: function (e) {
        (this.events = this.filterConfigs(e)),
          this.customProp.updateEvents(this.events);
      },
      filterConfigs: function (e) {
        return this.getAssignConfigs(function (e) {
          return !(!r(e) || e.h5 === !1);
        }, e);
      },
    },
    ta = {
      events: [],
      init: function (e) {
        this.filterWebClickEvents(e);
      },
      filterWebClickEvents: function (e) {
        this.events = na.getAssignConfigs(function (e) {
          return !(
            !r(e) ||
            e.event.unlimited_div !== !0 ||
            'webclick' !== e.event_type
          );
        }, e);
      },
      isTargetEle: function (e) {
        var t = ci.heatmap.getEleDetail(e);
        if (!r(t) || !d(t.$element_path)) return !1;
        for (var n = 0; n < this.events.length; n++)
          if (
            r(this.events[n]) &&
            r(this.events[n].event) &&
            na.configIsMatch(t, this.events[n].event)
          )
            return !0;
        return !1;
      },
    },
    ra = {
      events: [],
      configSwitch: !1,
      collectAble: function () {
        return (
          this.configSwitch &&
          r(ci.para.heatmap) &&
          ci.para.heatmap.get_vtrack_config
        );
      },
      updateEvents: function (e) {
        (this.events = na.getAssignConfigs(function (e) {
          return !!(r(e) && v(e.properties) && e.properties.length > 0);
        }, e)),
          this.events.length
            ? (this.configSwitch = !0)
            : (this.configSwitch = !1);
      },
      getVtrackProps: function (e) {
        var t = {};
        return this.collectAble()
          ? ('$WebClick' === e.event &&
              (t = this.clickCustomPropMaker(e, this.events)),
            t)
          : {};
      },
      clickCustomPropMaker: function (e, t, n) {
        var i = this;
        n = n || this.filterConfig(e, t, na.url_info.page_url);
        var a = {};
        return n.length
          ? (k(n, function (t) {
              v(t.properties) &&
                t.properties.length > 0 &&
                k(t.properties, function (t) {
                  var n = i.getProp(t, e);
                  r(n) && P(a, n);
                });
            }),
            a)
          : {};
      },
      getProp: Qi.getProp,
      getPropElInLi: Qi.getPropElInLi,
      filterConfig: Qi.filterConfig,
    },
    na = {
      unlimitedDiv: ta,
      config: {},
      storageEnable: !0,
      storage_name: 'webjssdkvtrackcollect',
      para: { session_time: 18e5, timeout: 5e3, update_interval: 18e5 },
      url_info: {},
      timer: null,
      update_time: null,
      customProp: ra,
      initUrl: function () {
        var e = Qi.initUrl();
        if (e) {
          var t;
          try {
            (t = new f(ci.para.server_url)),
              (t._values.Path = '/config/visualized/Web.conf'),
              (e.api_url = t.getUrl());
          } catch (r) {
            return (
              ci.log(
                '----vtrackcollect---API\u5730\u5740\u89e3\u6790\u5f02\u5e38',
                r,
              ),
              !1
            );
          }
          this.url_info = e;
        }
        return e;
      },
      init: function () {
        if (!r(ci.para.heatmap) || !ci.para.heatmap.get_vtrack_config)
          return !1;
        if ((fi.isSupport() || (this.storageEnable = !1), !this.initUrl()))
          return (
            ci.log(
              '----vtrackcustom----\u521d\u59cb\u5316\u5931\u8d25\uff0curl\u4fe1\u606f\u89e3\u6790\u5931\u8d25',
            ),
            !1
          );
        if (this.storageEnable) {
          var e = Wi.readObjectVal(this.storage_name);
          if (r(e) && r(e.data))
            if (this.serverUrlIsSame(e.serverUrl)) {
              (this.config = e.data),
                (this.update_time = e.updateTime),
                this.updateConfig(e.data);
              var t = new Date().getTime(),
                n = t - this.update_time;
              if (ce(n) && n > 0 && n < this.para.session_time) {
                var i = this.para.update_interval - n;
                this.setNextFetch(i);
              } else this.getConfigFromServer();
            } else this.getConfigFromServer();
          else this.getConfigFromServer();
        } else this.getConfigFromServer();
        this.pageStateListenner();
      },
      serverUrlIsSame: function (e) {
        return (
          !!r(e) &&
          e.host === this.url_info.server_url.host &&
          e.project === this.url_info.server_url.project
        );
      },
      getConfigFromServer: function () {
        var e = this,
          t = function (t, n) {
            e.update_time = new Date().getTime();
            var i = {};
            200 === t
              ? n && r(n) && 'Web' === n.os && ((i = n), e.updateConfig(i))
              : 205 === t
              ? e.updateConfig(i)
              : 304 === t
              ? (i = e.config)
              : (ci.log('----vtrackcustom----\u6570\u636e\u5f02\u5e38', t),
                e.updateConfig(i)),
              e.updateStorage(i),
              e.setNextFetch();
          },
          n = function (t) {
            (e.update_time = new Date().getTime()),
              ci.log(
                '----vtrackcustom----\u914d\u7f6e\u62c9\u53d6\u5931\u8d25',
                t,
              ),
              e.setNextFetch();
          };
        this.sendRequest(t, n);
      },
      setNextFetch: function (e) {
        var t = this;
        this.timer && (clearTimeout(this.timer), (this.timer = null)),
          (e = e || this.para.update_interval),
          (this.timer = setTimeout(function () {
            t.getConfigFromServer();
          }, e));
      },
      pageStateListenner: function () {
        var e = this;
        _e({
          visible: function () {
            var t = new Date().getTime(),
              r = t - e.update_time;
            if (ce(r) && r > 0 && r < e.para.update_interval) {
              var n = e.para.update_interval - r;
              e.setNextFetch(n);
            } else e.getConfigFromServer();
          },
          hidden: function () {
            e.timer && (clearTimeout(e.timer), (e.timer = null));
          },
        });
      },
      updateConfig: function (e) {
        return (
          !!r(e) &&
          ((this.config = e),
          this.customProp.updateEvents(e),
          void this.unlimitedDiv.init(e))
        );
      },
      updateStorage: function (e) {
        if (!this.storageEnable) return !1;
        if (!r(e)) return !1;
        var t;
        if (this.url_info.server_url) t = this.url_info.server_url;
        else {
          var n = na.initUrl();
          if (!n) return !1;
          t = n.server_url;
        }
        var i = { updateTime: new Date().getTime(), data: e, serverUrl: t };
        Wi.saveObjectVal(this.storage_name, i);
      },
      sendRequest: function (e, t) {
        var r = this,
          n = { app_id: this.url_info.page_url.host };
        this.config.version && (n.v = this.config.version),
          fe({
            url: r.url_info.api_url,
            callbackName: 'saJSSDKVtrackCollectConfig',
            data: n,
            timeout: r.para.timeout,
            success: function (t, r) {
              e(t, r);
            },
            error: function (e) {
              t(e);
            },
          });
      },
      getAssignConfigs: Qi.getAssignConfigs,
      configIsMatch: Qi.configIsMatch,
    },
    ia = {
      basicProps: { priority: 0, entry: ct },
      formatData: { priority: 0, entry: lt },
      finalAdjustData: { priority: 0, entry: ut },
    },
    aa = {
      stage: null,
      init: function (e) {
        this.stage = e;
      },
      interceptor: ia,
    },
    sa = {};
  (sa.check = et),
    (sa.sendItem = function (e) {
      var t = {
        lib: {
          $lib: 'js',
          $lib_method: 'code',
          $lib_version: String(ci.lib_version),
        },
        time: 1 * new Date(),
      };
      P(t, e), pt(t), ci.kit.sendData(t);
    }),
    (sa.send = function (e, t) {
      var r = ci.kit.buildData(e);
      ci.kit.sendData(r, t);
    });
  var oa = {
      stage: null,
      init: function (e) {
        this.stage = e;
      },
    },
    la = { label: !1, li: !1, a: !0, button: !0 },
    ua = {
      otherTags: [],
      initUnlimitedTags: function () {
        k(ua.otherTags, function (e) {
          e in la && (la[e] = !0);
        });
      },
      isUnlimitedTag: function (e) {
        if (!e || 1 !== e.nodeType) return !1;
        var t = e.nodeName.toLowerCase();
        return la[t] || Y(e, ci.para.heatmap.track_attr);
      },
      getTargetElement: function (e, t) {
        var r = this,
          n = e;
        if ('object' != typeof n) return null;
        if ('string' != typeof n.tagName) return null;
        var i = n.tagName.toLowerCase();
        if ('body' === i.toLowerCase() || 'html' === i.toLowerCase())
          return null;
        if (!n || !n.parentNode || !n.parentNode.children) return null;
        var a = n.parentNode,
          s = r.otherTags;
        if ('a' === i || 'button' === i || 'input' === i || 'textarea' === i)
          return n;
        if (re(s, i) > -1) return n;
        if (
          'area' === i &&
          'map' === a.tagName.toLowerCase() &&
          y(a).prev().tagName &&
          'img' === y(a).prev().tagName.toLowerCase()
        )
          return y(a).prev();
        if (
          'div' === i &&
          ci.para.heatmap.collect_tags.div &&
          r.isDivLevelValid(n)
        ) {
          var o =
            (ci.para.heatmap &&
              ci.para.heatmap.collect_tags &&
              ci.para.heatmap.collect_tags.div &&
              ci.para.heatmap.collect_tags.div.max_level) ||
            1;
          if (o > 1 || r.isCollectableDiv(n)) return n;
        }
        if (r.isStyleTag(i) && ci.para.heatmap.collect_tags.div) {
          var l = r.getCollectableParent(n);
          if (l && r.isDivLevelValid(l)) return l;
        }
        var u = r.hasElement(
          { event: (t && t.originalEvent) || t, element: e },
          function (e) {
            return r.isUnlimitedTag(e);
          },
        );
        return u || null;
      },
      getDivLevels: function (e, t) {
        var r = ua.getElementPath(e, !0, t),
          n = r.split(' > '),
          i = 0;
        return (
          k(n, function (e) {
            'div' === e && i++;
          }),
          i
        );
      },
      isDivLevelValid: function (e) {
        for (
          var t =
              (ci.para.heatmap &&
                ci.para.heatmap.collect_tags &&
                ci.para.heatmap.collect_tags.div &&
                ci.para.heatmap.collect_tags.div.max_level) ||
              1,
            r = e.getElementsByTagName('div'),
            n = r.length - 1;
          n >= 0;
          n--
        )
          if (ua.getDivLevels(r[n], e) > t) return !1;
        return !0;
      },
      getElementPath: function (e, t, r) {
        for (var n = []; e.parentNode && g(e); ) {
          if (e.id && !t && /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(e.id)) {
            n.unshift(e.tagName.toLowerCase() + '#' + e.id);
            break;
          }
          if (r && e === r) {
            n.unshift(e.tagName.toLowerCase());
            break;
          }
          if (e === document.body) {
            n.unshift('body');
            break;
          }
          n.unshift(e.tagName.toLowerCase()), (e = e.parentNode);
        }
        return n.join(' > ');
      },
      getClosestLi: function (t) {
        var r = function (t, r) {
          for (; t && t !== document && 1 === t.nodeType; t = t.parentNode)
            if (
              t.tagName &&
              e(t.tagName.toLowerCase) &&
              t.tagName.toLowerCase() === r
            )
              return t;
          return null;
        };
        return r(t, 'li');
      },
      getElementPosition: function (e, t, r) {
        function n(e) {
          var t = e.parentNode;
          if (!t) return '';
          var r = y(e).getSameTypeSiblings(),
            n = r.length;
          if (1 === n) return 0;
          for (
            var i = 0, a = e;
            y(a).previousElementSibling().ele;
            a = y(a).previousElementSibling().ele, i++
          );
          return i;
        }
        var i = ci.heatmap.getClosestLi(e);
        if (!i || !g(e)) return null;
        var a = e.tagName.toLowerCase(),
          s = i.getElementsByTagName(a),
          o = s.length,
          l = [];
        if (o > 1) {
          for (var u = 0; u < o; u++) {
            var c = ci.heatmap.getElementPath(s[u], r);
            c === t && l.push(s[u]);
          }
          if (l.length > 1) return re(l, e);
        }
        return n(i);
      },
      setNotice: function (e) {
        (ci.is_heatmap_render_mode = !0),
          ci.para.heatmap ||
            (ci.errorMsg =
              '\u60a8SDK\u6ca1\u6709\u914d\u7f6e\u5f00\u542f\u70b9\u51fb\u56fe\uff0c\u53ef\u80fd\u6ca1\u6709\u6570\u636e\uff01'),
          e &&
            'http:' === e.slice(0, 5) &&
            'https:' === location.protocol &&
            (ci.errorMsg =
              '\u60a8\u7684\u5f53\u524d\u9875\u9762\u662fhttps\u7684\u5730\u5740\uff0c\u795e\u7b56\u5206\u6790\u73af\u5883\u4e5f\u5fc5\u987b\u662fhttps\uff01'),
          ci.para.heatmap_url ||
            (ci.para.heatmap_url =
              _t() +
              '//static.sensorsdata.cn/sdk/' +
              ci.lib_version +
              '/heatmap.min.js');
      },
      getDomIndex: function (e) {
        if (!e.parentNode) return -1;
        for (
          var t = 0, r = e.tagName, n = e.parentNode.children, i = 0;
          i < n.length;
          i++
        )
          if (n[i].tagName === r) {
            if (e === n[i]) return t;
            t++;
          }
        return -1;
      },
      selector: function (e, t) {
        var r =
          e.parentNode && 9 == e.parentNode.nodeType ? -1 : this.getDomIndex(e);
        return e.getAttribute &&
          e.getAttribute('id') &&
          /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(e.getAttribute('id')) &&
          (!ci.para.heatmap ||
            (ci.para.heatmap &&
              'not_use_id' !== ci.para.heatmap.element_selector)) &&
          !t
          ? '#' + e.getAttribute('id')
          : e.tagName.toLowerCase() +
              (~r ? ':nth-of-type(' + (r + 1) + ')' : '');
      },
      getDomSelector: function (e, t, r) {
        if (!e || !e.parentNode || !e.parentNode.children) return !1;
        t = t && t.join ? t : [];
        var n = e.nodeName.toLowerCase();
        return e && 'body' !== n && 1 == e.nodeType
          ? (t.unshift(this.selector(e, r)),
            e.getAttribute &&
            e.getAttribute('id') &&
            /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(e.getAttribute('id')) &&
            ci.para.heatmap &&
            'not_use_id' !== ci.para.heatmap.element_selector &&
            !r
              ? t.join(' > ')
              : this.getDomSelector(e.parentNode, t, r))
          : (t.unshift('body'), t.join(' > '));
      },
      na: function () {
        var e = document.documentElement.scrollLeft || window.pageXOffset;
        return parseInt(isNaN(e) ? 0 : e, 10);
      },
      i: function () {
        var e = 0;
        try {
          (e =
            (o.documentElement && o.documentElement.scrollTop) ||
            m.pageYOffset),
            (e = isNaN(e) ? 0 : e);
        } catch (t) {
          e = 0;
        }
        return parseInt(e, 10);
      },
      getBrowserWidth: function () {
        var e = window.innerWidth || document.body.clientWidth;
        return isNaN(e) ? 0 : parseInt(e, 10);
      },
      getBrowserHeight: function () {
        var e = window.innerHeight || document.body.clientHeight;
        return isNaN(e) ? 0 : parseInt(e, 10);
      },
      getScrollWidth: function () {
        var e = parseInt(document.body.scrollWidth, 10);
        return isNaN(e) ? 0 : e;
      },
      getEleDetail: function (e) {
        var t = this.getDomSelector(e),
          r = ze({ target: e });
        (r.$element_selector = t ? t : ''),
          (r.$element_path = ci.heatmap.getElementPath(
            e,
            ci.para.heatmap &&
              'not_use_id' === ci.para.heatmap.element_selector,
          ));
        var n = ci.heatmap.getElementPosition(
          e,
          r.$element_path,
          ci.para.heatmap && 'not_use_id' === ci.para.heatmap.element_selector,
        );
        return ce(n) && (r.$element_position = n), r;
      },
      getPointerEventProp: function (e, t) {
        function r() {
          var e =
              document.body.scrollLeft ||
              document.documentElement.scrollLeft ||
              0,
            t =
              document.body.scrollTop ||
              document.documentElement.scrollTop ||
              0;
          return { scrollLeft: e, scrollTop: t };
        }
        function n(e) {
          if (document.documentElement.getBoundingClientRect) {
            var t = e.getBoundingClientRect();
            return {
              targetEleX: t.left + r().scrollLeft || 0,
              targetEleY: t.top + r().scrollTop || 0,
            };
          }
        }
        function i(e) {
          return Number(Number(e).toFixed(3));
        }
        function a(e) {
          var a =
              e.pageX ||
              e.clientX + r().scrollLeft ||
              e.offsetX + n(t).targetEleX ||
              0,
            s =
              e.pageY ||
              e.clientY + r().scrollTop ||
              e.offsetY + n(t).targetEleY ||
              0;
          return { $page_x: i(a), $page_y: i(s) };
        }
        return e ? a(e) : {};
      },
      start: function (t, n, i, a, s) {
        if (
          r(ci.para.heatmap) &&
          e(ci.para.heatmap.collect_element) &&
          !ci.para.heatmap.collect_element(n)
        )
          return !1;
        var o = ua.getBasicEleInfo(t, n, i, a, s);
        gt(o);
      },
      getBasicEleInfo: function (t, n, i, a, s) {
        var o = r(a) ? a : {},
          l = e(s) ? s : e(a) ? a : void 0,
          u = this.getEleDetail(n);
        if (ci.para.heatmap && ci.para.heatmap.custom_property) {
          var c = ci.para.heatmap.custom_property(n);
          r(c) && (u = P(u, c));
        }
        return (
          (u = P(u, this.getPointerEventProp(t, n), o)),
          { event: t, target: n, props: u, tagName: i, callback: l }
        );
      },
      hasElement: function (e, t) {
        var r;
        if (e.event) {
          var n = e.event;
          r = n.path || (n._getPath && n._getPath());
        } else e.element && (r = y(e.element).getParents());
        if (r && v(r) && r.length > 0)
          for (var i = 0; i < r.length; i++)
            if ('object' == typeof r[i] && 1 === r[i].nodeType && t(r[i]))
              return r[i];
      },
      isStyleTag: function (e, t) {
        var n = ['a', 'div', 'input', 'button', 'textarea'],
          i = [
            'mark',
            '/mark',
            'strong',
            'b',
            'em',
            'i',
            'u',
            'abbr',
            'ins',
            'del',
            's',
            'sup',
          ];
        return (
          !(re(n, e) > -1) &&
          (!t ||
          (ci.para.heatmap &&
            ci.para.heatmap.collect_tags &&
            ci.para.heatmap.collect_tags.div)
            ? !!(
                r(ci.para.heatmap) &&
                r(ci.para.heatmap.collect_tags) &&
                r(ci.para.heatmap.collect_tags.div) &&
                v(ci.para.heatmap.collect_tags.div.ignore_tags) &&
                re(ci.para.heatmap.collect_tags.div.ignore_tags, e) > -1
              )
            : re(i, e) > -1)
        );
      },
      isCollectableDiv: function (e, t) {
        try {
          if (0 === e.children.length) return !0;
          for (var r = 0; r < e.children.length; r++)
            if (1 === e.children[r].nodeType) {
              var n = e.children[r].tagName.toLowerCase(),
                i =
                  ci.para &&
                  ci.para.heatmap &&
                  ci.para.heatmap.collect_tags &&
                  ci.para.heatmap.collect_tags.div &&
                  ci.para.heatmap.collect_tags.div.max_level;
              if (!(('div' === n && i > 1) || this.isStyleTag(n, t))) return !1;
              if (!this.isCollectableDiv(e.children[r], t)) return !1;
            }
          return !0;
        } catch (a) {
          ci.log(a);
        }
        return !1;
      },
      getCollectableParent: function (e, t) {
        try {
          var r = e.parentNode,
            n = r ? r.tagName.toLowerCase() : '';
          if ('body' === n) return !1;
          var i =
            ci.para &&
            ci.para.heatmap &&
            ci.para.heatmap.collect_tags &&
            ci.para.heatmap.collect_tags.div &&
            ci.para.heatmap.collect_tags.div.max_level;
          if (n && 'div' === n && (i > 1 || this.isCollectableDiv(r, t)))
            return r;
          if (r && this.isStyleTag(n, t))
            return this.getCollectableParent(r, t);
        } catch (a) {
          ci.log(a);
        }
        return !1;
      },
      listenUrlChange: function (e) {
        e(),
          ci.ee.spa.on('switch', function () {
            e();
          });
      },
      initScrollmap: function () {
        if (
          !r(ci.para.heatmap) ||
          'default' !== ci.para.heatmap.scroll_notice_map
        )
          return !1;
        var t = !0;
        ci.para.scrollmap &&
          e(ci.para.scrollmap.collect_url) &&
          this.listenUrlChange(function () {
            t = !!ci.para.scrollmap.collect_url();
          });
        var n = function (e) {
            var t = {};
            return (
              (t.timeout = e.timeout || 1e3),
              (t.func = e.func),
              (t.hasInit = !1),
              (t.inter = null),
              (t.main = function (e, t) {
                this.func(e, t), (this.inter = null);
              }),
              (t.go = function (e) {
                var r = {};
                this.inter ||
                  ((r.$viewport_position =
                    (document.documentElement &&
                      document.documentElement.scrollTop) ||
                    window.pageYOffset ||
                    document.body.scrollTop ||
                    0),
                  (r.$viewport_position =
                    Math.round(r.$viewport_position) || 0),
                  e
                    ? t.main(r, !0)
                    : (this.inter = setTimeout(function () {
                        t.main(r);
                      }, this.timeout)));
              }),
              t
            );
          },
          i = n({
            timeout: 1e3,
            func: function (e, t) {
              var r =
                  (document.documentElement &&
                    document.documentElement.scrollTop) ||
                  window.pageYOffset ||
                  document.body.scrollTop ||
                  0,
                n = new Date(),
                i = n - this.current_time;
              ((i > ci.para.heatmap.scroll_delay_time &&
                r - e.$viewport_position !== 0) ||
                t) &&
                ((e.$url = Z()),
                (e.$title = document.title),
                (e.$url_path = G()),
                (e.event_duration = Math.min(
                  ci.para.heatmap.scroll_event_duration,
                  parseInt(i) / 1e3,
                )),
                (e.event_duration =
                  e.event_duration < 0 ? 0 : e.event_duration),
                ht(e)),
                (this.current_time = n);
            },
          });
        (i.current_time = new Date()),
          He(window, 'scroll', function () {
            return !!t && void i.go();
          }),
          He(window, 'unload', function () {
            return !!t && void i.go('notime');
          });
      },
      initHeatmap: function () {
        var t = this,
          n = !0;
        return (
          !(!r(ci.para.heatmap) || 'default' !== ci.para.heatmap.clickmap) &&
          (e(ci.para.heatmap.collect_url) &&
            this.listenUrlChange(function () {
              n = !!ci.para.heatmap.collect_url();
            }),
          'all' === ci.para.heatmap.collect_elements
            ? (ci.para.heatmap.collect_elements = 'all')
            : (ci.para.heatmap.collect_elements = 'interact'),
          void ('all' === ci.para.heatmap.collect_elements
            ? He(document, 'click', function (e) {
                if (!n) return !1;
                var r = e || window.event;
                if (!r) return !1;
                var i = r.target || r.srcElement;
                if ('object' != typeof i) return !1;
                if ('string' != typeof i.tagName) return !1;
                var a = i.tagName.toLowerCase();
                if ('body' === a || 'html' === a) return !1;
                if (!i || !i.parentNode || !i.parentNode.children) return !1;
                var s = i.parentNode.tagName.toLowerCase();
                'a' === s || 'button' === s
                  ? t.start(r, i.parentNode, s)
                  : t.start(r, i, a);
              })
            : He(document, 'click', function (e) {
                if (!n) return !1;
                var i = e || window.event;
                if (!i) return !1;
                var a = i.target || i.srcElement,
                  s = ci.heatmap.getTargetElement(a, e);
                s
                  ? t.start(i, s, s.tagName.toLowerCase())
                  : g(a) &&
                    'div' === a.tagName.toLowerCase() &&
                    r(ci.para.heatmap) &&
                    ci.para.heatmap.get_vtrack_config &&
                    ta.events.length > 0 &&
                    ta.isTargetEle(a) &&
                    t.start(i, a, a.tagName.toLowerCase(), {
                      $lib_method: 'vtrack',
                    });
              })))
        );
      },
    },
    ca = {
      autoTrackIsUsed: !1,
      isReady: function (t) {
        return e(t)
          ? void t()
          : void ci.log('error: isReady callback must be function');
      },
      getUtm: function () {
        return Ui.campaignParams();
      },
      getStayTime: function () {
        return (new Date() - ci._t) / 1e3;
      },
      setProfileLocal: function (e) {
        if (!fi.isSupport()) return ci.setProfile(e), !1;
        if (!r(e) || se(e)) return !1;
        var t = Wi.readObjectVal('sensorsdata_2015_jssdk_profile'),
          n = !1;
        if (r(t) && !se(t)) {
          for (var i in e)
            (!(i in t && t[i] !== e[i]) && i in t) || ((t[i] = e[i]), (n = !0));
          n &&
            (Wi.saveObjectVal('sensorsdata_2015_jssdk_profile', t),
            ci.setProfile(e));
        } else
          Wi.saveObjectVal('sensorsdata_2015_jssdk_profile', e),
            ci.setProfile(e);
      },
      setInitReferrer: function () {
        var e = De();
        ci.setOnceProfile({
          _init_referrer: e,
          _init_referrer_host: Ui.pageProp.referrer_host,
        });
      },
      setSessionReferrer: function () {
        var e = De();
        Wi.setSessionPropsOnce({
          _session_referrer: e,
          _session_referrer_host: Ui.pageProp.referrer_host,
        });
      },
      setDefaultAttr: function () {
        Ui.register({
          _current_url: location.href,
          _referrer: De(),
          _referring_host: Ui.pageProp.referrer_host,
        });
      },
      trackHeatMap: function (e, t, r) {
        if ('object' == typeof e && e.tagName && g(e.parentNode)) {
          var n = e.tagName.toLowerCase(),
            i = e.parentNode.tagName.toLowerCase(),
            a =
              ci.para.heatmap && ci.para.heatmap.track_attr
                ? ci.para.heatmap.track_attr
                : ['data-sensors-click'];
          'button' === n ||
            'a' === n ||
            'a' === i ||
            'button' === i ||
            'input' === n ||
            'textarea' === n ||
            Y(e, a) ||
            ua.start(null, e, n, t, r);
        }
      },
      trackAllHeatMap: function (e, t, r) {
        if ('object' == typeof e && e.tagName) {
          var n = e.tagName.toLowerCase();
          ua.start(null, e, n, t, r);
        }
      },
      autoTrackSinglePage: function (e, t) {
        function n(e, t) {
          ci.track(
            '$pageview',
            P(
              {
                $referrer: i,
                $url: Z(),
                $url_path: G(),
                $title: document.title,
              },
              e,
              mt(),
            ),
            t,
          ),
            (i = Z());
        }
        var i;
        (i = this.autoTrackIsUsed ? Ui.pageProp.url : Ui.pageProp.referrer),
          (e = r(e) ? e : {});
        var a = !e.not_set_profile;
        e.not_set_profile && delete e.not_set_profile,
          n(e, t),
          (this.autoTrackSinglePage = n),
          vt(ci.setOnceProfile, !1, a);
      },
      autoTrackWithoutProfile: function (e, t) {
        (e = r(e) ? e : {}), this.autoTrack(P(e, { not_set_profile: !0 }), t);
      },
      autoTrack: function (e, t) {
        e = r(e) ? e : {};
        var n = mt(),
          i = !e.not_set_profile;
        e.not_set_profile && delete e.not_set_profile;
        var a = location.href;
        ci.para.is_single_page &&
          w(function () {
            var r = De(a, !0);
            ci.track(
              '$pageview',
              P(
                {
                  $referrer: r,
                  $url: Z(),
                  $url_path: G(),
                  $title: document.title,
                },
                n,
                e,
              ),
              t,
            ),
              (a = Z());
          }),
          ci.track(
            '$pageview',
            P(
              {
                $referrer: De(null, !0),
                $url: Z(),
                $url_path: G(),
                $title: document.title,
              },
              n,
              e,
            ),
            t,
          ),
          vt(ci.setOnceProfile, !0, i),
          (this.autoTrackIsUsed = !0);
      },
      getAnonymousID: function () {
        return se(Wi._state)
          ? 'SDK is not initialized.'
          : Wi._state._first_id ||
              Wi._state.first_id ||
              Wi._state._distinct_id ||
              Wi._state.distinct_id;
      },
      setPlugin: function (t) {
        return (
          !!r(t) &&
          void k(t, function (t, n) {
            e(t) &&
              (r(window.SensorsDataWebJSSDKPlugin) &&
              window.SensorsDataWebJSSDKPlugin[n]
                ? t(window.SensorsDataWebJSSDKPlugin[n])
                : r(ci.modules) && ci.modules[n]
                ? t(window.SensorsDataWebJSSDKPlugin[n])
                : ci.log(
                    n + 'is not found,please check sensorsdata documents.',
                  ));
          })
        );
      },
      useModulePlugin: function () {
        ci.use.apply(ci, arguments);
      },
      useAppPlugin: function () {
        this.setPlugin.apply(this, arguments);
      },
    },
    da = new l(),
    pa = new l(),
    fa = {};
  (fa.spa = da),
    (fa.sdk = pa),
    (fa.initSystemEvent = function () {
      yt(function (e) {
        da.emit('switch', e);
      });
    }),
    (fa.EVENT_LIST = {
      spaSwitch: ['spa', 'switch'],
      sdkBeforeInit: ['sdk', 'beforeInit'],
      sdkInitPara: ['sdk', 'initPara'],
      sdkAfterInitPara: ['sdk', 'afterInitPara'],
      sdkInitAPI: ['sdk', 'initAPI'],
      sdkAfterInitAPI: ['sdk', 'afterInitAPI'],
      sdkAfterInit: ['sdk', 'afterInit'],
      sdkReady: ['sdk', 'ready'],
    });
  var _a = {
      state: 0,
      historyState: [],
      stateType: {
        1: '1-init\u672a\u5f00\u59cb',
        2: '2-init\u5f00\u59cb',
        3: '3-store\u5b8c\u6210',
      },
      getState: function () {
        return this.historyState.join('\n');
      },
      setState: function (e) {
        String(e) in this.stateType && (this.state = e),
          this.historyState.push(this.stateType[e]);
      },
    },
    ga = 1,
    ha = {
      __proto__: null,
      setInitVar: Pt,
      initPara: Ct,
      quick: Nt,
      use: Ot,
      track: jt,
      bind: Tt,
      unbind: It,
      trackLink: $t,
      trackLinks: At,
      setItem: Dt,
      deleteItem: xt,
      setProfile: Et,
      setOnceProfile: Lt,
      appendProfile: Ut,
      incrementProfile: Rt,
      deleteProfile: Ht,
      unsetProfile: Bt,
      identify: Jt,
      trackSignup: qt,
      registerPage: Kt,
      clearAllRegister: Vt,
      clearPageRegister: Ft,
      register: zt,
      registerOnce: Wt,
      registerSession: Xt,
      registerSessionOnce: Zt,
      login: Gt,
      loginWithKey: Qt,
      logout: Yt,
      getPresetProperties: er,
      readyState: _a,
      log: Ne,
      debug: Li,
      on: bt,
      disableLocalLog: je,
      enableLocalLog: Oe,
    };
  pi.setup(Ne);
  var ma = P({}, Oi, Fi),
    va = {
      bridge_info: {
        touch_app_bridge: !1,
        verify_success: !1,
        platform: '',
        support_two_way_call: !1,
      },
      is_verify_success: !1,
      initPara: function () {
        var e = {
          is_send:
            ci.para.use_app_track_is_send !== !1 &&
            'only' !== ci.para.use_app_track,
          white_list: [],
          is_mui: 'mui' === ci.para.use_app_track,
        };
        'object' == typeof ci.para.app_js_bridge
          ? (ci.para.app_js_bridge = P({}, e, ci.para.app_js_bridge))
          : (ci.para.use_app_track !== !0 &&
              ci.para.app_js_bridge !== !0 &&
              'only' !== ci.para.use_app_track &&
              'mui' !== ci.para.use_app_track) ||
            (ci.para.app_js_bridge = P({}, e)),
          ci.para.app_js_bridge.is_send === !1 &&
            ci.log(
              '\u8bbe\u7f6e\u4e86 is_send:false,\u5982\u679c\u6253\u901a\u5931\u8d25\uff0c\u6570\u636e\u5c06\u88ab\u4e22\u5f03!',
            );
      },
      app_js_bridge_v1: function () {
        function e(e) {
          (n = e),
            ue(n) && (n = JSON.parse(n)),
            i && (i(n), (i = null), (n = null));
        }
        function t() {
          'object' == typeof window.SensorsData_APP_JS_Bridge &&
            window.SensorsData_APP_JS_Bridge.sensorsdata_call_app &&
            ((n = window.SensorsData_APP_JS_Bridge.sensorsdata_call_app()),
            ue(n) && (n = JSON.parse(n)));
        }
        function r() {
          if (
            /iPad|iPhone|iPod/.test(navigator.userAgent) &&
            !window.MSStream
          ) {
            var e = document.createElement('iframe');
            e.setAttribute('src', 'sensorsanalytics://getAppInfo'),
              document.documentElement.appendChild(e),
              e.parentNode.removeChild(e),
              (e = null);
          }
        }
        var n = null,
          i = null;
        (window.sensorsdata_app_js_bridge_call_js = function (t) {
          e(t);
        }),
          (ci.getAppStatus = function (e) {
            return (
              r(), t(), e ? void (null === n ? (i = e) : (e(n), (n = null))) : n
            );
          });
      },
      hasVisualModeBridge: function () {
        var e = window.SensorsData_App_Visual_Bridge,
          t = 'sensorsdata_visualized_mode';
        return r(e) && e[t] && (e[t] === !0 || e[t]());
      },
      validateAppUrl: ir,
    };
  (rr.prototype.call = function (e, t) {
    var r = this,
      i =
        new Date().getTime().toString(16) +
        String(n()).replace('.', '').slice(1, 8);
    (this.resultCbs[i] = r.resultCbs[i] || { result: null, callbacks: [] }),
      (this.timeoutCbs[i] = r.timeoutCbs[i] || {
        isTimeout: !1,
        callbacks: [],
      }),
      (e = e.data ? e : { data: e }),
      (e.data.message_id = i);
    var a = P({ callType: this.type }, e);
    return (
      t &&
        (this.timerId = setTimeout(function () {
          r.timeoutCbs[i].isTimeout = !0;
          for (var e in r.timeoutCbs[i].callbacks)
            r.timeoutCbs[i].callbacks[e].call(null),
              r.timeoutCbs[i].callbacks.splice(e, 1);
        }, t)),
      nr(a),
      {
        onResult: function (e) {
          return r.resultCbs[i].result
            ? (e(r.resultCbs[i].result), this)
            : (!r.timeoutCbs[i].isTimeout && r.resultCbs[i].callbacks.push(e),
              this);
        },
        onTimeout: function (e) {
          return r.timeoutCbs[i].isTimeout
            ? (e(), this)
            : (!r.resultCbs[i].result && r.timeoutCbs[i].callbacks.push(e),
              this);
        },
      }
    );
  }),
    (rr.prototype.onAppNotify = function (e) {
      this.appCallJsCallback = e;
    }),
    (rr.prototype.notifyApp = function (e, t) {
      var r = P({ callType: this.type }, e);
      return t && (r.message_id = t), nr(r);
    }),
    (ar.prototype = {
      'double': function () {},
      getAppData: function () {},
      hasAppBridge: function () {
        return ci.bridge.bridge_info.support_two_way_call;
      },
      init: function () {},
      jsCallApp: function () {},
      requestToApp: function (t) {
        this.bridge
          .call(t, t.timeout.time)
          .onResult(function (r) {
            e(t.callback) && t.callback(r);
          })
          .onTimeout(function () {
            e(t.timeout.callback) && t.timeout.callback();
          });
      },
    });
  var ya = {
      isSeachHasKeyword: function () {
        return (
          '' !== F(location.href, 'sa-request-id') &&
          ('string' == typeof sessionStorage.getItem('sensors-visual-mode') &&
            sessionStorage.removeItem('sensors-visual-mode'),
          !0)
        );
      },
      hasKeywordHandle: function () {
        var e = location.href,
          t = F(e, 'sa-request-id') || null,
          r = F(e, 'sa-request-type') || null,
          n = F(e, 'sa-request-url') || null;
        if ((ua.setNotice(n), ki.isSupport()))
          if (
            (null !== n && sessionStorage.setItem('sensors_heatmap_url', n),
            sessionStorage.setItem('sensors_heatmap_id', t),
            null !== r)
          )
            '1' === r || '2' === r || '3' === r
              ? sessionStorage.setItem('sensors_heatmap_type', r)
              : (r = null);
          else {
            var i = sessionStorage.getItem('sensors_heatmap_type');
            r = null !== i ? i : null;
          }
        this.isReady(t, r);
      },
      isReady: function (e, t, r) {
        ci.para.heatmap_url
          ? ge({
              success: function () {
                setTimeout(function () {
                  'undefined' != typeof sa_jssdk_heatmap_render &&
                    (sa_jssdk_heatmap_render(ci, e, t, r),
                    'object' == typeof console &&
                      'function' == typeof console.log &&
                      ((ci.heatmap_version &&
                        ci.heatmap_version === ci.lib_version) ||
                        console.log(
                          'heatmap.js\u4e0esensorsdata.js\u7248\u672c\u53f7\u4e0d\u4e00\u81f4\uff0c\u53ef\u80fd\u5b58\u5728\u98ce\u9669!',
                        )));
                }, 0);
              },
              error: function () {},
              type: 'js',
              url: ci.para.heatmap_url,
            })
          : ci.log('\u6ca1\u6709\u6307\u5b9aheatmap_url\u7684\u8def\u5f84');
      },
      isStorageHasKeyword: function () {
        return (
          ki.isSupport() &&
          'string' == typeof sessionStorage.getItem('sensors_heatmap_id')
        );
      },
      storageHasKeywordHandle: function () {
        ua.setNotice(),
          ya.isReady(
            sessionStorage.getItem('sensors_heatmap_id'),
            sessionStorage.getItem('sensors_heatmap_type'),
            location.href,
          );
      },
      isWindowNameHasKeyword: function () {
        try {
          var e = JSON.parse(window.name),
            t = d(e['sa-request-page-url'])
              ? u(e['sa-request-page-url'])
              : null;
          return (
            e['sa-request-id'] && d(e['sa-request-id']) && t === location.href
          );
        } catch (r) {
          return !1;
        }
      },
      windowNameHasKeywordHandle: function () {
        function e(e) {
          var r = t[e];
          return d(r) ? u(r) : null;
        }
        var t = JSON.parse(window.name),
          r = e('sa-request-id'),
          n = e('sa-request-type'),
          i = e('sa-request-url');
        ua.setNotice(i),
          ki.isSupport() &&
            (null !== i && sessionStorage.setItem('sensors_heatmap_url', i),
            sessionStorage.setItem('sensors_heatmap_id', r),
            null !== n
              ? '1' === n || '2' === n || '3' === n
                ? sessionStorage.setItem('sensors_heatmap_type', n)
                : (n = null)
              : (n =
                  null !== sessionStorage.getItem('sensors_heatmap_type')
                    ? sessionStorage.getItem('sensors_heatmap_type')
                    : null)),
          ya.isReady(r, n);
      },
    },
    ba = {
      isStorageHasKeyword: function () {
        return (
          ki.isSupport() &&
          'string' == typeof sessionStorage.getItem('sensors-visual-mode')
        );
      },
      isSearchHasKeyword: function () {
        return (
          (or('sa-visual-mode') === !0 || 'true' === or('sa-visual-mode')) &&
          ('string' == typeof sessionStorage.getItem('sensors_heatmap_id') &&
            sessionStorage.removeItem('sensors_heatmap_id'),
          !0)
        );
      },
      loadVtrack: function () {
        ge({
          success: function () {},
          error: function () {},
          type: 'js',
          url: ci.para.vtrack_url
            ? ci.para.vtrack_url
            : _t() +
              '//static.sensorsdata.cn/sdk/' +
              ci.lib_version +
              '/vtrack.min.js',
        });
      },
      messageListener: function (e) {
        function t(e) {
          return oe(e)
            ? he(e)
            : (ci.log(
                '\u53ef\u89c6\u5316\u6a21\u5f0f\u68c0\u6d4b URL \u5931\u8d25',
              ),
              !1);
        }
        if (!e || !e.data || 'sa-fe' !== e.data.source) return !1;
        if ('v-track-mode' === e.data.type) {
          if (e.data.data && e.data.data.isVtrack)
            if (
              (ki.isSupport() &&
                sessionStorage.setItem('sensors-visual-mode', 'true'),
              e.data.data.userURL && location.href.match(/sa-visual-mode=true/))
            ) {
              var r = t(e.data.data.userURL);
              r && (window.location.href = r);
            } else ba.loadVtrack();
          window.removeEventListener('message', ba.messageListener, !1);
        }
      },
      removeMessageHandle: function () {
        window.removeEventListener &&
          window.removeEventListener('message', ba.messageListener, !1);
      },
      verifyVtrackMode: function () {
        window.addEventListener &&
          window.addEventListener('message', ba.messageListener, !1),
          ba.postMessage();
      },
      postMessage: function () {
        try {
          window.parent &&
            window.parent.postMessage &&
            window.parent.postMessage(
              {
                source: 'sa-web-sdk',
                type: 'v-is-vtrack',
                data: { sdkversion: $i },
              },
              '*',
            );
        } catch (e) {
          ci.log(
            '\u6d4f\u89c8\u5668\u7248\u672c\u8fc7\u4f4e\uff0c\u4e0d\u652f\u6301 postMessage API',
          );
        }
      },
      notifyUser: function () {
        var e = function (t) {
          return (
            !(!t || !t.data || 'sa-fe' !== t.data.source) &&
            void (
              'v-track-mode' === t.data.type &&
              (t.data.data &&
                t.data.data.isVtrack &&
                alert(
                  '\u5f53\u524d\u7248\u672c\u4e0d\u652f\u6301\uff0c\u8bf7\u5347\u7ea7\u90e8\u7f72\u795e\u7b56\u6570\u636e\u6cbb\u7406',
                ),
              window.removeEventListener('message', e, !1))
            )
          );
        };
        window.addEventListener && window.addEventListener('message', e, !1),
          ba.postMessage();
      },
    },
    wa = [
      'setItem',
      'deleteItem',
      'getAppStatus',
      'track',
      'quick',
      'register',
      'registerPage',
      'registerOnce',
      'trackSignup',
      'setProfile',
      'setOnceProfile',
      'appendProfile',
      'incrementProfile',
      'deleteProfile',
      'unsetProfile',
      'identify',
      'login',
      'logout',
      'trackLink',
      'clearAllRegister',
      'clearPageRegister',
      'bind',
      'unbind',
      'loginWithKey',
    ],
    Sa = {
      track: function (e, t, r) {},
      quick: function (e, t, r, n) {},
      register: function (e) {},
      registerPage: function (e) {},
      registerOnce: function (e) {},
      clearAllRegister: function (e) {},
      trackSignup: function (e, t, r, n) {},
      setProfile: function (e, t) {},
      setOnceProfile: function (e, t) {},
      appendProfile: function (e, t) {},
      incrementProfile: function (e, t) {},
      deleteProfile: function (e) {},
      unsetProfile: function (e, t) {},
      identify: function (e, t) {},
      login: function (e, t) {},
      logout: function (e) {},
      trackLink: function (e, t, r) {},
      deleteItem: function (e, t) {},
      setItem: function (e, t, r) {},
      getAppStatus: function (e) {},
      clearPageRegister: function (e) {},
    };
  (mr.prototype.process = function (e, t) {
    if (!(e && e in this.processDef))
      return void Ne('process [' + e + '] is not supported');
    var r = this.registeredInterceptors[e];
    if (r && v(r) && r.length > 0)
      for (
        var n = { current: 0, total: r.length }, i = new hr(t, n, ci), a = 0;
        a < r.length;
        a++
      )
        try {
          if (
            ((n.current = a + 1),
            (t = r[a].call(null, t, i) || t),
            i.cancellationToken.getCanceled())
          )
            break;
          if (i.cancellationToken.getStopped()) return;
        } catch (s) {
          Ne('interceptor error:' + s);
        }
    return (
      this.processDef[e] &&
        this.processDef[e] in this.processDef &&
        (t = this.process(this.processDef[e], t)),
      t
    );
  }),
    (mr.prototype.registerStageImplementation = function (t) {
      t &&
        t.init &&
        e(t.init) &&
        (t.init(this),
        t.interceptor && this.registerInterceptor(t.interceptor));
    }),
    (mr.prototype.registerInterceptor = function (t) {
      if (t)
        for (var n in t) {
          var i = t[n];
          if (i && r(i) && e(i.entry)) {
            ce(i.priority) || (i.priority = Number.MAX_VALUE),
              this.registeredInterceptors[n] ||
                (this.registeredInterceptors[n] = []);
            var a = this.registeredInterceptors[n];
            (i.entry.priority = i.priority),
              a.push(i.entry),
              a.sort(function (e, t) {
                return e.priority - t.priority;
              });
          }
        }
    });
  var ka = {
      basicProps: 'extendProps',
      extendProps: 'formatData',
      formatData: 'finalAdjustData',
      finalAdjustData: null,
    },
    Pa = new mr(ka),
    Ca = { send: null },
    Na = new mr(Ca),
    Oa = { getUtmData: null, callSchema: null },
    ja = new mr(Oa),
    Ta = { webClickEvent: null, webStayEvent: null },
    Ia = new mr(Ta),
    $a = {
      buildDataStage: function (e) {
        e && Pa.registerInterceptor(e);
      },
      businessStage: function (e) {
        e && ja.registerInterceptor(e);
      },
      sendDataStage: function (e) {
        e && Na.registerInterceptor(e);
      },
      viewStage: function (e) {
        e && Ia.registerInterceptor(e);
      },
    },
    Aa = {
      stage: null,
      init: function (e) {
        this.stage = e;
      },
    },
    Da = {
      stage: null,
      init: function (e) {
        this.stage = e;
      },
      interceptor: {
        send: {
          entry: function (e) {
            return e;
          },
        },
      },
    },
    xa = {};
  (xa.buildData = function (e) {
    return dt(e);
  }),
    (xa.sendData = function (e, t) {
      var r = qe(e.properties),
        n = {
          server_url: ci.para.server_url,
          data: e,
          config: r || {},
          callback: t,
        };
      wr(n), ci.log(e);
    }),
    (xa.encodeTrackData = function (e) {
      return Qe(e);
    }),
    (xa.getUtmData = function () {
      return br();
    });
  var Ea = {
      webClickEvent: {
        entry: function (e, t) {
          var r = t.sensors;
          'a' === e.tagName &&
          r.para.heatmap &&
          r.para.heatmap.isTrackLink === !0
            ? r.trackLink(
                { event: e.event, target: e.target },
                '$WebClick',
                e.props,
              )
            : r.track('$WebClick', e.props, e.callback);
        },
      },
      webStayEvent: {
        entry: function (e, t) {
          var r = t.sensors;
          r.track('$WebStay', e);
        },
      },
    },
    La = window.sensors_data_pre_config,
    Ua = !!ma.isObject(La) && La.is_compliance_enabled;
  (ci.init = function (e) {
    return (
      fa.sdk.emit('beforeInit'),
      !(ci.readyState && ci.readyState.state && ci.readyState.state >= 2) &&
        (Ua && (Pr(!0), _r()),
        fa.initSystemEvent(),
        ci.setInitVar(),
        ci.readyState.setState(2),
        ci.initPara(e),
        fa.sdk.emit('initPara'),
        fa.sdk.emit('afterInitPara'),
        fa.sdk.emit('initAPI'),
        fa.sdk.emit('afterInitAPI'),
        ci.detectMode(),
        tr(),
        fa.sdk.emit('afterInit'),
        void fa.sdk.emit('ready'))
    );
  }),
    Ua ? Pr(!1) : (Pr(!0), _r());
  var Ra,
    Ha,
    Ba,
    Ja,
    Ma,
    qa,
    Ka,
    Va,
    Fa,
    za,
    Wa,
    Xa,
    Za,
    Ga,
    Qa,
    Ya,
    es,
    ts,
    rs = '1.25.2',
    ns = {
      init: function (e) {
        var t = e._.isString,
          r = e._.rot13defs,
          n = e._.dfmapping,
          i = 'data:enc;',
          a = 'dfm-enc-';
        e.ee.sdk.on('afterInitPara', function () {
          (e.kit.userEncrypt = function (e) {
            return a + n(e);
          }),
            (e.kit.userDecrypt = function (e) {
              return (
                0 === e.indexOf(i)
                  ? ((e = e.substring(i.length)), (e = r(e)))
                  : 0 === e.indexOf(a) &&
                    ((e = e.substring(a.length)), (e = n(e))),
                e
              );
            }),
            (e.kit.userDecryptIfNeeded = function (r) {
              return (
                !t(r) ||
                  (0 !== r.indexOf(i) && 0 !== r.indexOf(a)) ||
                  (r = e.kit.userDecrypt(r)),
                r
              );
            });
        });
      },
      plugin_name: 'UserEncryptDefault',
    },
    is = Nr(ns),
    as = '1.25.2',
    ss = {
      sd: null,
      init: function (e) {
        if (this.sd) return !1;
        if (((this.sd = e), !this.sd || !this.sd._)) return !1;
        var t = this.sd._.cookie.get('sensors_amp_id'),
          r = this.sd.store._state.distinct_id;
        if (t && t.length > 0) {
          var n = 'amp-' === t.slice(0, 4);
          if (t !== r) {
            if (!n) return !1;
            this.sd.store._state.first_id
              ? (this.sd.identify(t, !0),
                this.sd.saEvent.send(
                  {
                    original_id: t,
                    distinct_id: r,
                    type: 'track_signup',
                    event: '$SignUp',
                    properties: {},
                  },
                  null,
                ),
                this.setAmpId(r))
              : this.sd.identify(t, !0);
          }
        } else this.setAmpId(r);
        this.addListener();
      },
      addListener: function () {
        var e = this;
        this.sd.events.on('changeDistinctId', function (t) {
          e.setAmpId(t);
        }),
          this.sd.events.isReady();
      },
      setAmpId: function (e) {
        this.sd._.cookie.set('sensors_amp_id', e);
      },
    },
    os = jr(ss, 'Amp', 'sdkReady'),
    ls = window.SensorsData_App_Visual_Bridge,
    us = ls && ls.sensorsdata_visualized_mode,
    cs = ls && ls.sensorsdata_visualized_alert_info,
    ds = ls && ls.sensorsdata_hover_web_nodes,
    ps = {
      isVerify: function () {
        return us && (us === !0 || us.call(ls));
      },
      commands: {
        app_alert: Tr,
        visualized_track: Ir,
        page_info: Ir,
        sensorsdata_get_app_visual_config: $r,
      },
    },
    fs = '1.25.2',
    _s = {
      init: function (e) {
        (Ja = e),
          (Ma = Ja && Ja._),
          (qa = (Ja && Ja.log) || (console && console.log) || function () {}),
          xr();
      },
      handleCommand: Lr,
    },
    gs = Dr(_s, 'AndroidBridge', 'sdkAfterInitPara'),
    hs = window.SensorsData_App_Visual_Bridge,
    ms = hs && hs.sensorsdata_visualized_mode,
    vs = hs && hs.sensorsdata_visualized_alert_info,
    ys = hs && hs.sensorsdata_hover_web_nodes,
    bs = {
      isVerify: function () {
        return ms && (ms === !0 || ms.call(hs));
      },
      commands: {
        app_alert: Ur,
        visualized_track: Rr,
        page_info: Rr,
        sensorsdata_get_app_visual_config: Hr,
      },
    },
    ws = '1.25.2',
    Ss = {
      init: function (e) {
        (Wa = e),
          (Xa = Wa && Wa._),
          (Za = (Wa && Wa.log) || (console && console.log) || function () {}),
          Mr();
      },
      handleCommand: Kr,
    },
    ks = Jr(Ss, 'AndroidObsoleteBridge', 'sdkAfterInitPara'),
    Ps = '1.25.2',
    Cs = {
      event_list: [],
      latest_event_initial_time: null,
      max_save_time: 2592e6,
      init: function (e, t) {
        function r() {
          return (
            (Ga = Qa._),
            (Ya = Qa.store),
            !!Ga.localStorage.isSupport() &&
              ((Qa.para.max_string_length = 1024),
              n.eventList.init(),
              n.addLatestChannelUrl(),
              void n.addIsChannelCallbackEvent())
          );
        }
        if (Qa || !e) return !1;
        (t = t || {}),
          (es = t.cookie_name || 'sensorsdata2015jssdkchannel'),
          (Qa = e);
        var n = this;
        r();
      },
      addIsChannelCallbackEvent: function () {
        Qa.registerPage({
          $is_channel_callback_event: function (e) {
            if (
              Ga.isObject(e) &&
              e.event &&
              '$WebClick' !== e.event &&
              '$pageview' !== e.event &&
              '$WebStay' !== e.event &&
              '$SignUp' !== e.event
            )
              return (
                !Cs.eventList.hasEvent(e.event) &&
                (Cs.eventList.add(e.event), !0)
              );
          },
        });
      },
      addLatestChannelUrl: function () {
        var e = this.getUrlDomain(),
          t = this.cookie.getChannel();
        if ('url\u89e3\u6790\u5931\u8d25' === e)
          this.registerAndSave({
            _sa_channel_landing_url: '',
            _sa_channel_landing_url_error:
              'url\u7684domain\u89e3\u6790\u5931\u8d25',
          });
        else if (Ga.isReferralTraffic(document.referrer)) {
          var r = Ga.getQueryParam(location.href, 'sat_cf');
          Ga.isString(r) && r.length > 0
            ? (this.registerAndSave({ _sa_channel_landing_url: location.href }),
              Cs.channelLinkHandler())
            : this.registerAndSave({ _sa_channel_landing_url: '' });
        } else
          t
            ? Qa.registerPage(t)
            : Qa.registerPage({
                _sa_channel_landing_url: '',
                _sa_channel_landing_url_error: '\u53d6\u503c\u5f02\u5e38',
              });
      },
      registerAndSave: function (e) {
        Qa.registerPage(e), this.cookie.saveChannel(e);
      },
      cookie: {
        getChannel: function () {
          var e = Qa.kit.userDecryptIfNeeded(Ga.cookie.get(es));
          return (
            (e = Ga.safeJSONParse(e)), !(!Ga.isObject(e) || !e.prop) && e.prop
          );
        },
        saveChannel: function (e) {
          var t = { prop: e },
            r = JSON.stringify(t);
          Qa.para.encrypt_cookie && (r = Qa.kit.userEncrypt(r)),
            Ga.cookie.set(es, r);
        },
      },
      channelLinkHandler: function () {
        this.eventList.reset(), Qa.track('$ChannelLinkReaching');
      },
      getUrlDomain: function () {
        var e = Ga.info.pageProp.url_domain;
        return '' === e && (e = 'url\u89e3\u6790\u5931\u8d25'), e;
      },
      eventList: {
        init: function () {
          var e = this.get(),
            t = new Date().getTime();
          if (
            e &&
            Ga.isNumber(e.latest_event_initial_time) &&
            Ga.isArray(e.eventList)
          ) {
            var r = t - e.latest_event_initial_time;
            r > 0 && r < Cs.max_save_time
              ? ((Cs.event_list = e.eventList),
                (Cs.latest_event_initial_time = e.latest_event_initial_time))
              : this.reset();
          } else this.reset();
        },
        get: function () {
          var e = {};
          try {
            e = Ya.readObjectVal('sawebjssdkchannel');
          } catch (t) {
            Qa.log(t);
          }
          return e;
        },
        add: function (e) {
          Cs.event_list.push(e), this.save();
        },
        save: function () {
          var e = {
            latest_event_initial_time: Cs.latest_event_initial_time,
            eventList: Cs.event_list,
          };
          Ya.saveObjectVal('sawebjssdkchannel', e);
        },
        reset: function () {
          (Cs.event_list = []),
            (Cs.latest_event_initial_time = new Date().getTime()),
            this.save();
        },
        hasEvent: function (e) {
          var t = !1;
          return (
            Ga.each(Cs.event_list, function (r) {
              r === e && (t = !0);
            }),
            t
          );
        },
      },
    },
    Ns = Fr(Cs, 'SensorsChannel', 'sdkAfterInitAPI'),
    Os = '1.25.2',
    js =
      (/micromessenger\/([\d.]+)/i.test(navigator.userAgent || ''),
      function () {
        var e = {};
        return (
          'undefined' != typeof document.hidden
            ? ((e.hidden = 'hidden'), (e.visibilityChange = 'visibilitychange'))
            : 'undefined' != typeof document.msHidden
            ? ((e.hidden = 'msHidden'),
              (e.visibilityChange = 'msvisibilitychange'))
            : 'undefined' != typeof document.webkitHidden &&
              ((e.hidden = 'webkitHidden'),
              (e.visibilityChange = 'webkitvisibilitychange')),
          e
        );
      });
  ts = js().hidden;
  var Ts,
    Is,
    $s,
    As,
    Ds,
    xs,
    Es,
    Ls,
    Us = { android: /Android/i, iOS: /iPhone|iPad|iPod/i },
    Rs = function () {
      for (var e in Us) if (navigator.userAgent.match(Us[e])) return e;
      return '';
    },
    Hs = Rs(),
    Bs = function () {
      return Us.hasOwnProperty(Hs);
    },
    Js = function (e) {
      return (
        null != e && '[object Object]' == Object.prototype.toString.call(e)
      );
    },
    Ms = function (e) {
      var t = /\/sd\/(\w+)\/(\w+)$/;
      return e.match(t);
    },
    qs = function (e) {
      var t = e._.URL(e.para.server_url);
      return {
        origin: t.origin,
        project: t.searchParams.get('project') || 'default',
      };
    },
    Ks = function (e, t, r) {
      e.log('\u5c1d\u8bd5\u5524\u8d77 android app');
      var n = t;
      e.log('\u5524\u8d77APP\u7684\u5730\u5740\uff1a' + n),
        (window.location = n),
        (e.timer = setTimeout(function () {
          var t = Xr();
          return (
            e.log('hide:' + ts + ':' + document[ts]),
            t
              ? (e.log('The page is hidden, stop navigating to download page'),
                !1)
              : (e.log(
                  'App\u53ef\u80fd\u672a\u5b89\u88c5\uff0c\u8df3\u8f6c\u5230\u4e0b\u8f7d\u5730\u5740',
                ),
                void (window.location = r))
          );
        }, e.timeout));
    },
    Vs = function (e, t, r) {
      e.log('\u5c1d\u8bd5\u5524\u8d77 iOS app:' + t),
        (window.location.href = t),
        (e.timer = setTimeout(function () {
          var t = Xr();
          return t
            ? (e.log('The page is hidden, stop navigating to download page'),
              !1)
            : (e.log(
                'App\u53ef\u80fd\u672a\u5b89\u88c5\uff0c\u8df3\u8f6c\u5230\u4e0b\u8f7d\u5730\u5740',
              ),
              void (window.location.href = r));
        }, e.timeout)),
        e.log('new timer:' + e.timer);
    },
    Fs = {
      key: null,
      timer: null,
      sd: null,
      data: null,
      timeout: 2500,
      apiURL:
        '{origin}/sdk/deeplink/param?key={key}&system_type=JS&project={project}',
      init: function (e) {
        if (this.sd)
          return this.log('deeplink\u5df2\u7ecf\u521d\u59cb\u5316'), !1;
        if (((this.sd = e), this.log('deeplink init called'), null === this.sd))
          return (
            this.log('\u795e\u7b56JS SDK\u672a\u6210\u529f\u5f15\u5165'), !1
          );
        var t = {};
        if (
          (arguments.length > 0 &&
            (1 === arguments.length && Js(arguments[0])
              ? (t = arguments[0])
              : arguments.length >= 2 &&
                Js(arguments[1]) &&
                (t = arguments[1])),
          !Bs())
        )
          return (
            this.log(
              '\u4e0d\u652f\u6301\u5f53\u524d\u7cfb\u7edf\uff0c\u76ee\u524d\u53ea\u652f\u6301Android\u548ciOS',
            ),
            !1
          );
        if (
          (Js(t) &&
            this.sd._.isNumber(t.timeout) &&
            t.timeout >= 2500 &&
            (this.timeout = t.timeout),
          !this.sd.para.server_url)
        )
          return (
            this.log(
              '\u795e\u7b56JS SDK\u914d\u7f6e\u9879server_url\u672a\u6b63\u786e\u914d\u7f6e',
            ),
            !1
          );
        var r = qs(this.sd);
        this.apiURL = this.apiURL
          .replace('{origin}', r.origin)
          .replace('{project}', r.project);
        var n = this.sd._.getQueryParam(window.location.href, 'deeplink');
        if (!n)
          return (
            this.log(
              '\u5f53\u524d\u9875\u9762\u7f3a\u5c11deeplink\u53c2\u6570',
            ),
            !1
          );
        n = window.decodeURIComponent(n);
        var i = Ms(n);
        return i
          ? ((this.key = i[2]),
            (this.apiURL = this.apiURL.replace(
              '{key}',
              window.encodeURIComponent(i[2]),
            )),
            this.sd._.ajax({
              url: this.apiURL,
              type: 'GET',
              cors: !0,
              credentials: !1,
              success: function (e) {
                return e.errorMsg
                  ? (Fs.log('API\u62a5\u9519\uff1a' + e.errorMsg), !1)
                  : ((Fs.data = e),
                    Fs.log(
                      'API\u67e5\u8be2\u6210\u529f\uff0c\u6570\u636e\uff1a' +
                        JSON.stringify(e, null, '  '),
                    ),
                    void (
                      this.data.app_key &&
                      (this.data.android_info &&
                        this.data.android_info.url_schemes &&
                        (this.data.android_info.url_schemes +=
                          '://sensorsdata/sd/' +
                          this.data.app_key +
                          '/' +
                          this.key),
                      this.data.ios_info &&
                        this.data.ios_info.url_schemes &&
                        (this.data.ios_info.url_schemes +=
                          '://sensorsdata/sd/' +
                          this.data.app_key +
                          '/' +
                          this.key))
                    ));
              }.bind(this),
              error: function () {
                Fs.log('API\u67e5\u8be2\u51fa\u9519');
              },
            }),
            void this.addListeners())
          : (this.log(
              '\u5f53\u524d\u9875\u9762\u7684deeplink\u53c2\u6570\u65e0\u6548',
            ),
            !1);
      },
      openDeepLink: function () {
        if ((this.log('openDeeplink()'), !this.data))
          return this.log('\u6ca1\u6709Deep link\u6570\u636e!'), !1;
        if ('iOS' === Hs) {
          this.log('\u5f53\u524d\u7cfb\u7edf\u662fiOS');
          var e =
            this.sd &&
            this.sd._ &&
            this.sd._.getIOSVersion() >= 9 &&
            this.data.ios_info.ios_wake_url
              ? this.data.ios_info.ios_wake_url
              : this.data.ios_info.url_schemes;
          this.log('\u5524\u8d77APP\u7684\u5730\u5740\uff1a' + e),
            Vs(this, e, this.data.ios_info.download_url);
        } else
          this.log('\u5f53\u524d\u7cfb\u7edf\u662f android'),
            Ks(
              this,
              this.data.android_info.url_schemes,
              this.data.android_info.download_url,
            );
      },
      log: function (e) {
        this.sd && this.sd.log(e);
      },
      addListeners: function () {
        var e = js().visibilityChange;
        e &&
          document.addEventListener(
            e,
            function () {
              clearTimeout(this.timer),
                this.log('visibilitychange, clear timeout:' + this.timer);
            }.bind(this),
            !1,
          ),
          window.addEventListener(
            'pagehide',
            function () {
              this.log('page hide, clear timeout:' + this.timer),
                clearTimeout(this.timer);
            }.bind(this),
            !1,
          );
      },
    },
    zs = Wr(Fs, 'Deeplink', 'sdkReady'),
    Ws = '1.25.2',
    Xs = {
      init: function (e) {
        ($s = e),
          (As = $s && $s._),
          (Ds = ($s && $s.log) || (console && console.log) || function () {}),
          Qr();
      },
      handleCommand: en,
    },
    Zs = Gr(Xs, 'IOSBridge', 'sdkAfterInitPara'),
    Gs = '1.25.2',
    Qs = {
      init: function (e) {
        (xs = e),
          (Es = xs && xs._),
          (Ls = (xs && xs.log) || (console && console.log) || function () {}),
          nn();
      },
    },
    Ys = rn(Qs, 'IOSObsoleteBridge', 'sdkAfterInitPara'),
    eo = '1.25.2',
    to = 5e3,
    ro = 432e3;
  (cn.prototype.init = function (e, t) {
    if (e) {
      if (((this.sd = e), (this._ = this.sd._), t)) {
        this.option = t;
        var r = t.heartbeat_interval_time;
        r &&
          (this._.isNumber(r) || this._.isNumber(1 * r)) &&
          1 * r > 0 &&
          (this.heartbeat_interval_time = 1e3 * r);
        var n = t.max_duration;
        n &&
          (this._.isNumber(n) || this._.isNumber(1 * n)) &&
          1 * n > 0 &&
          (this.max_duration = n);
      }
      (this.page_id = Number(
        String(this._.getRandom()).slice(2, 5) +
          String(this._.getRandom()).slice(2, 4) +
          String(new Date().getTime()).slice(-4),
      )),
        this.addEventListener(),
        document.hidden === !0
          ? (this.page_show_status = !1)
          : this.addHeartBeatInterval(),
        this.log('PageLeave\u521d\u59cb\u5316\u5b8c\u6bd5');
    } else this.log('\u795e\u7b56JS SDK\u672a\u6210\u529f\u5f15\u5165');
  }),
    (cn.prototype.log = function (e) {
      this.sd && this.sd.log(e);
    }),
    (cn.prototype.refreshPageEndTimer = function () {
      var e = this;
      this.timer && (clearTimeout(this.timer), (this.timer = null)),
        (this.timer = setTimeout(function () {
          e.page_hidden_status = !1;
        }, to));
    }),
    (cn.prototype.hiddenStatusHandler = function () {
      clearTimeout(this.timer),
        (this.timer = null),
        (this.page_hidden_status = !1);
    }),
    (cn.prototype.pageStartHandler = function () {
      (this.start_time = +new Date()),
        1 == !document.hidden
          ? (this.page_show_status = !0)
          : (this.page_show_status = !1),
        (this.url = location.href),
        (this.title = document.title);
    }),
    (cn.prototype.pageEndHandler = function () {
      if (this.page_hidden_status !== !0) {
        var e = this.getPageLeaveProperties();
        this.page_show_status === !1 && delete e.event_duration,
          (this.page_show_status = !1),
          (this.page_hidden_status = !0),
          this.isCollectUrl(this.url) && this.sd.track('$WebPageLeave', e),
          this.refreshPageEndTimer(),
          this.delHeartBeatData();
      }
    }),
    (cn.prototype.addEventListener = function () {
      this.addPageStartListener(),
        this.addPageSwitchListener(),
        this.addSinglePageListener(),
        this.addPageEndListener();
    }),
    (cn.prototype.addPageStartListener = function () {
      var e = this;
      'onpageshow' in window &&
        this._.addEvent(window, 'pageshow', function () {
          e.pageStartHandler(), e.hiddenStatusHandler();
        });
    }),
    (cn.prototype.isCollectUrl = function (e) {
      return (
        'function' != typeof this.option.isCollectUrl ||
        'string' != typeof e ||
        '' === e ||
        this.option.isCollectUrl(e)
      );
    }),
    (cn.prototype.addSinglePageListener = function () {
      var e = this;
      this.sd.ee &&
        this.sd.ee.spa.prepend('switch', function (t) {
          t !== location.href &&
            ((e.url = t),
            e.pageEndHandler(),
            e.stopHeartBeatInterval(),
            (e.current_page_url = e.url),
            e.pageStartHandler(),
            e.hiddenStatusHandler(),
            e.addHeartBeatInterval());
        });
    }),
    (cn.prototype.addPageEndListener = function () {
      var e = this;
      this._.each(['pagehide', 'beforeunload', 'unload'], function (t) {
        'on' + t in window &&
          e._.addEvent(window, t, function () {
            e.pageEndHandler(), e.stopHeartBeatInterval();
          });
      });
    }),
    (cn.prototype.addPageSwitchListener = function () {
      var e = this;
      this._.listenPageState({
        visible: function () {
          e.pageStartHandler(),
            e.hiddenStatusHandler(),
            e.addHeartBeatInterval();
        },
        hidden: function () {
          (e.url = location.href),
            (e.title = document.title),
            e.pageEndHandler(),
            e.stopHeartBeatInterval();
        },
      });
    }),
    (cn.prototype.addHeartBeatInterval = function () {
      this._.localStorage.isSupport() && this.startHeartBeatInterval();
    }),
    (cn.prototype.startHeartBeatInterval = function () {
      var e = this;
      this.heartbeat_interval_timer && this.stopHeartBeatInterval();
      var t = !0;
      this.isCollectUrl(this.url) || (t = !1),
        (this.heartbeat_interval_timer = setInterval(function () {
          t && e.saveHeartBeatData();
        }, this.heartbeat_interval_time)),
        t && this.saveHeartBeatData('is_first_heartbeat'),
        this.reissueHeartBeatData();
    }),
    (cn.prototype.stopHeartBeatInterval = function () {
      clearInterval(this.heartbeat_interval_timer),
        (this.heartbeat_interval_timer = null);
    }),
    (cn.prototype.saveHeartBeatData = function (e) {
      var t = this.getPageLeaveProperties(),
        r = new Date();
      (t.$time = r), 'is_first_heartbeat' === e && (t.event_duration = 3.14);
      var n = this.sd.kit.buildData({
        type: 'track',
        event: '$WebPageLeave',
        properties: t,
      });
      try {
        'success' === this.sd.bridge.bridge_info.verify_success &&
          (n.properties.$time = 1 * r);
      } catch (i) {
        this.log(i.message);
      }
      (n.heartbeat_interval_time = this.heartbeat_interval_time),
        this.sd.store.saveObjectVal(this.storage_name + '-' + this.page_id, n);
    }),
    (cn.prototype.delHeartBeatData = function (e) {
      this._.localStorage.isSupport() &&
        this._.localStorage.remove(e || this.storage_name + '-' + this.page_id);
    }),
    (cn.prototype.reissueHeartBeatData = function () {
      for (var e = window.localStorage.length, t = e - 1; t >= 0; t--) {
        var r = window.localStorage.key(t);
        if (
          r &&
          r !== this.storage_name + '-' + this.page_id &&
          0 === r.indexOf(this.storage_name + '-')
        ) {
          var n = this.sd.store.readObjectVal(r);
          this._.isObject(n) &&
            1 * new Date() - n.time > n.heartbeat_interval_time + 5e3 &&
            (delete n.heartbeat_interval_time,
            this.sd.kit.sendData(n),
            this.delHeartBeatData(r));
        }
      }
    }),
    (cn.prototype.getPageLeaveProperties = function () {
      var e = (+new Date() - this.start_time) / 1e3;
      (isNaN(e) || e < 0 || e > this.max_duration) && (e = 0),
        (e = Number(e.toFixed(3)));
      var t = this._.getReferrer(this.current_page_url),
        r =
          (document.documentElement && document.documentElement.scrollTop) ||
          window.pageYOffset ||
          (document.body && document.body.scrollTop) ||
          0;
      r = Math.round(r) || 0;
      var n = {
        $title: this.title,
        $url: this._.getURL(this.url),
        $url_path: this._.getURLPath(this._.URL(this.url).pathname),
        $referrer_host: t ? this._.getHostname(t) : '',
        $referrer: t,
        $viewport_position: r,
      };
      return (
        0 !== e && (n.event_duration = e),
        (n = this._.extend(n, this.option.custom_props))
      );
    });
  var no = new cn(),
    io = un(no, 'PageLeave', 'sdkReady'),
    ao = '1.25.2',
    so = !1,
    oo = {
      init: function (e, t) {
        function r(t, r) {
          if (t.getEntries && 'function' == typeof t.getEntries) {
            for (var n = t.getEntries(), i = null, a = 0; a < n.length; a++)
              'transferSize' in n[a] && (i += n[a].transferSize);
            e._.isNumber(i) &&
              i >= 0 &&
              i < 10737418240 &&
              (r.$page_resource_size = Number((i / 1024).toFixed(3)));
          }
        }
        function n(t) {
          var r = 0;
          if (t.timing) {
            var n = t.timing;
            0 !== n.fetchStart &&
            e._.isNumber(n.fetchStart) &&
            0 !== n.domContentLoadedEventEnd &&
            e._.isNumber(n.domContentLoadedEventEnd)
              ? (r = n.domContentLoadedEventEnd - n.fetchStart)
              : e.log('performance \u6570\u636e\u83b7\u53d6\u5f02\u5e38');
          }
          return r;
        }
        function i(t) {
          var r = 0;
          if (e._.isFunction(t.getEntriesByType)) {
            var n = t.getEntriesByType('navigation') || [{}];
            r = (n[0] || {}).domContentLoadedEventEnd || 0;
          }
          return r;
        }
        function a() {
          var s = 0,
            o =
              window.performance ||
              window.webkitPerformance ||
              window.msPerformance ||
              window.mozPerformance,
            l = {
              $url: e._.getURL(),
              $title: document.title,
              $url_path: e._.getURLPath(),
              $referrer: e._.getReferrer(null, !0),
            };
          if (
            (o
              ? ((s = i(o) || n(o)), r(o, l))
              : e.log('\u6d4f\u89c8\u5668\u672a\u652f\u6301 performance API.'),
            s > 0)
          ) {
            var u = (e._.isObject(t) && t.max_duration) || 1800;
            (s = Number((s / 1e3).toFixed(3))),
              (!e._.isNumber(u) || u <= 0 || s <= u) && (l.event_duration = s);
          }
          so || (e.track('$WebPageLoad', l), (so = !0)),
            window.removeEventListener
              ? window.removeEventListener('load', a)
              : window.detachEvent && window.detachEvent('onload', a);
        }
        'complete' == document.readyState
          ? a()
          : window.addEventListener
          ? window.addEventListener('load', a)
          : window.attachEvent && window.attachEvent('onload', a);
      },
    },
    lo = pn(oo, 'PageLoad', 'sdkReady');
  (_n.prototype.init = function (e) {
    if (e) {
      (this.sd = e), (this._ = e._), (this.log = e.log);
      var t = this;
      e.registerInterceptor('buildDataStage', {
        extendProps: {
          priority: 0,
          entry: function (e) {
            return fn(e, t);
          },
        },
      });
    } else this.log('\u795e\u7b56JS SDK\u672a\u6210\u529f\u5f15\u5165');
  }),
    (_n.prototype.register = function (e) {
      return this.sd
        ? void (this._.isObject(e) &&
          this._.isArray(e.events) &&
          e.events.length > 0 &&
          this._.isObject(e.properties) &&
          !this._.isEmptyObject(e.properties)
            ? this.customRegister.push(e)
            : this.log('RegisterProperties: register \u53c2\u6570\u9519\u8bef'))
        : void this.log('\u795e\u7b56JS SDK\u672a\u6210\u529f\u5f15\u5165');
    }),
    (_n.prototype.hookRegister = function (e) {
      return this.sd
        ? void (this._.isFunction(e)
            ? this.customRegister.push(e)
            : this.log(
                'RegisterProperties: hookRegister \u53c2\u6570\u9519\u8bef',
              ))
        : void this.log('\u795e\u7b56JS SDK\u672a\u6210\u529f\u5f15\u5165');
    });
  var uo = '1.25.2';
  _n.prototype.plugin_name = 'RegisterProperties';
  var co,
    po,
    fo = new _n(),
    _o = hn(fo),
    go = '1.25.2',
    ho = (window.console && window.console.log) || function () {},
    mo = {
      init: function (e) {
        return (
          (co = e),
          (ho = (co && co.log) || ho),
          e && e.kit && e.kit.buildData
            ? ((po = co.kit.buildData),
              (co.kit.buildData = yn),
              void ho(
                'RegisterPropertyPageHeight \u63d2\u4ef6\u521d\u59cb\u5316\u5b8c\u6210',
              ))
            : void ho(
                'RegisterPropertyPageHeight \u63d2\u4ef6\u521d\u59cb\u5316\u5931\u8d25,\u5f53\u524d\u4e3bsdk\u4e0d\u652f\u6301 RegisterPropertyPageHeight \u63d2\u4ef6\uff0c\u8bf7\u5347\u7ea7\u4e3bsdk',
              )
        );
      },
    },
    vo = vn(mo, 'RegisterPropertyPageHeight', 'sdkReady'),
    yo = '1.25.2',
    bo = {};
  (bo.getPart = function (e) {
    var t = !1,
      r = this.option.length;
    if (r)
      for (var n = 0; n < r; n++)
        if (e.indexOf(this.option[n].part_url) > -1) return !0;
    return t;
  }),
    (bo.getPartHash = function (e) {
      var t = this.option.length,
        r = !1;
      if (t)
        for (var n = 0; n < t; n++)
          if (e.indexOf(this.option[n].part_url) > -1)
            return this.option[n].after_hash;
      return !!r;
    }),
    (bo.getCurrenId = function () {
      var e = this.store.getDistinctId() || '',
        t = this.store.getFirstId() || '';
      this._.urlSafeBase64 && this._.urlSafeBase64.encode
        ? (e = e
            ? this._.urlSafeBase64.trim(
                this._.urlSafeBase64.encode(this._.base64Encode(e)),
              )
            : '')
        : this._.rot13obfs && (e = e ? this._.rot13obfs(e) : '');
      var r = t ? 'f' + e : 'd' + e;
      return encodeURIComponent(r);
    }),
    (bo.rewriteUrl = function (e, t) {
      var r = this,
        n = /([^?#]+)(\?[^#]*)?(#.*)?/,
        i = n.exec(e),
        a = '';
      if (i) {
        var s,
          o = i[1] || '',
          l = i[2] || '',
          u = i[3] || '',
          c = '_sasdk=' + this.getCurrenId(),
          d = function (e) {
            var t = e.split('&'),
              n = [];
            return (
              r._.each(t, function (e) {
                e.indexOf('_sasdk=') > -1 ? n.push(c) : n.push(e);
              }),
              n.join('&')
            );
          };
        if (this.getPartHash(e)) {
          s = u.indexOf('_sasdk');
          var p = u.indexOf('?');
          a =
            p > -1
              ? s > -1
                ? o + l + '#' + u.substring(1, s) + d(u.substring(s, u.length))
                : o + l + u + '&' + c
              : o + l + '#' + u.substring(1) + '?' + c;
        } else {
          s = l.indexOf('_sasdk');
          var f = /^\?(\w)+/.test(l);
          a = f
            ? s > -1
              ? o + '?' + d(l.substring(1)) + u
              : o + l + '&' + c + u
            : o + '?' + c + u;
        }
        return t && (t.href = a), a;
      }
    }),
    (bo.getUrlId = function () {
      var e = location.href.match(/_sasdk=([aufd][^\?\#\&\=]+)/);
      if (this._.isArray(e) && e[1]) {
        var t = decodeURIComponent(e[1]);
        return (
          !t ||
            ('f' !== t.substring(0, 1) && 'd' !== t.substring(0, 1)) ||
            (this._.urlSafeBase64 &&
            this._.urlSafeBase64.isUrlSafeBase64 &&
            this._.urlSafeBase64.isUrlSafeBase64(t)
              ? (t =
                  t.substring(0, 1) +
                  this._.base64Decode(
                    this._.urlSafeBase64.decode(t.substring(1)),
                  ))
              : this._.rot13defs &&
                (t = t.substring(0, 1) + this._.rot13defs(t.substring(1)))),
          t
        );
      }
      return '';
    }),
    (bo.setRefferId = function (e) {
      var t = this.store.getDistinctId(),
        r = this.getUrlId();
      if (r && '' !== r) {
        var n = 'a' === r.substring(0, 1) || 'd' === r.substring(0, 1);
        (r = r.substring(1)),
          r !== t &&
            (n
              ? (this.sd.identify(r, !0),
                this.store.getFirstId() &&
                  this.sd.saEvent.send(
                    {
                      original_id: r,
                      distinct_id: t,
                      type: 'track_signup',
                      event: '$SignUp',
                      properties: {},
                    },
                    null,
                  ))
              : (this.store.getFirstId() && !e.re_login) || this.sd.login(r));
      }
    }),
    (bo.addListen = function () {
      var e = this,
        t = function (t) {
          var r,
            n,
            i = t.target,
            a = i.tagName.toLowerCase(),
            s = i.parentNode;
          if (
            ('a' === a && i.href) ||
            (s && s.tagName && 'a' === s.tagName.toLowerCase() && s.href)
          ) {
            'a' === a && i.href
              ? ((r = i.href), (n = i))
              : ((r = s.href), (n = s));
            var o = e._.URL(r),
              l = o.protocol;
            ('http:' !== l && 'https:' !== l) ||
              (e.getPart(r) && e.rewriteUrl(r, n));
          }
        };
      e._.addEvent(document, 'mousedown', t),
        window.PointerEvent &&
          'maxTouchPoints' in window.navigator &&
          window.navigator.maxTouchPoints >= 0 &&
          e._.addEvent(document, 'pointerdown', t);
    }),
    (bo.init = function (e, t) {
      function r(t) {
        for (var r = t.length, n = [], i = 0; i < r; i++)
          /[A-Za-z0-9]+\./.test(t[i].part_url) &&
          '[object Boolean]' == Object.prototype.toString.call(t[i].after_hash)
            ? n.push(t[i])
            : e.log(
                'linker \u914d\u7f6e\u7684\u7b2c ' +
                  (i + 1) +
                  ' \u9879\u683c\u5f0f\u4e0d\u6b63\u786e\uff0c\u8bf7\u68c0\u67e5\u53c2\u6570\u683c\u5f0f\uff01',
              );
        return n;
      }
      return (
        (this.sd = e),
        (this._ = e._),
        (this.store = e.store),
        (this.para = e.para),
        this._.isObject(t) && this._.isArray(t.linker) && t.linker.length > 0
          ? (this.setRefferId(t),
            this.addListen(),
            (this.option = t.linker),
            void (this.option = r(this.option)))
          : void e.log(
              '\u8bf7\u914d\u7f6e\u6253\u901a\u57df\u540d\u53c2\u6570\uff01',
            )
      );
    });
  var wo,
    So,
    ko,
    Po,
    Co,
    No,
    Oo,
    jo,
    To,
    Io,
    $o,
    Ao,
    Do,
    xo = wn(bo, 'SiteLinker', 'sdkReady'),
    Eo = 'utm_source utm_medium utm_campaign utm_content utm_term',
    Lo = '1.25.2',
    Uo = {
      init: function (e) {
        function t() {
          var e = Eo.split(' '),
            t = '',
            r = {};
          return (
            wo._.isArray(wo.para.source_channel) &&
              wo.para.source_channel.length > 0 &&
              ((e = e.concat(wo.para.source_channel)), (e = wo._.unique(e))),
            wo._.each(e, function (e) {
              (t = wo._.getQueryParam(location.href, e)),
                t.length && (r[e] = t);
            }),
            r
          );
        }
        e &&
          !wo &&
          ((wo = e),
          wo.registerInterceptor('businessStage', {
            getUtmData: {
              priority: 0,
              entry: function () {
                return t();
              },
            },
          }));
      },
    },
    Ro = kn(Uo, 'Utm', 'sdkAfterInitPara'),
    Ho = '1.25.2',
    Bo = !1,
    Jo = null,
    Mo = {
      init: function (e) {
        (Jo = e),
          (Jo.disableSDK = Nn),
          (Jo.enableSDK = On),
          (Jo.getDisabled = jn);
      },
    },
    qo = Cn(Mo, 'DisableSDK', 'sdkInitAPI'),
    Ko = '1.25.2',
    Vo = {
      plugin_name: 'DebugSender',
      init: function (e) {
        (So = e), (ko = So._), xn();
      },
    },
    Fo = In(Vo),
    zo = '1.25.2',
    Wo = {
      plugin_name: 'JsappSender',
      init: function (e) {
        (Po = e), (Co = Po._), Rn();
      },
    },
    Xo = Ln(Wo),
    Zo = '1.25.2',
    Go = null,
    Qo = {
      plugin_name: 'BatchSender',
      init: function (e) {
        (No = e), (Oo = No._), Kn();
      },
    },
    Yo = Jn(Qo),
    el = '1.25.2',
    tl = {
      plugin_name: 'BeaconSender',
      init: function (e) {
        (jo = e), (To = jo._), Zn();
      },
    },
    rl = Fn(tl),
    nl = '1.25.2',
    il = {
      plugin_name: 'AjaxSender',
      init: function (e) {
        (Io = e), ($o = Io._), ri();
      },
    },
    al = Qn(il),
    sl = '1.25.2',
    ol = {
      plugin_name: 'ImageSender',
      init: function (e) {
        (Ao = e), (Do = Ao._), ui();
      },
    },
    ll = ii(ol);
  ci.modules = ci.modules || {};
  for (
    var ul = [
        os,
        gs,
        ks,
        Ns,
        zs,
        Zs,
        Ys,
        io,
        lo,
        _o,
        vo,
        xo,
        Ro,
        qo,
        Fo,
        Xo,
        Yo,
        rl,
        al,
        ll,
      ],
      cl = [is, Ro, qo, Xo, Fo, gs, Zs, ks, Ys, Yo, rl, al, ll],
      dl = 0;
    dl < ul.length;
    dl++
  ) {
    var pl = ul[dl];
    ci._.isString(pl.plugin_name)
      ? (ci.modules[pl.plugin_name] = pl)
      : ci._.isArray(pl.plugin_name) &&
        ci._.each(pl.plugin_name, function (e) {
          ci.modules[e] = pl;
        });
  }
  for (dl = 0; dl < cl.length; dl++) ci.use(cl[dl]);
  var fl = ci;
  try {
    'string' == typeof window.sensorsDataAnalytic201505
      ? ((ci.para = window[sensorsDataAnalytic201505].para),
        (ci._q = window[sensorsDataAnalytic201505]._q),
        (window[sensorsDataAnalytic201505] = ci),
        (window.sensorsDataAnalytic201505 = ci),
        ci.init())
      : 'undefined' == typeof window.sensorsDataAnalytic201505
      ? (window.sensorsDataAnalytic201505 = ci)
      : (fl = window.sensorsDataAnalytic201505);
  } catch (_l) {
    if ('object' == typeof console && console.log)
      try {
        console.log(_l);
      } catch (gl) {
        ci.log(gl);
      }
  }
  var hl = fl;
  return hl;
});
