/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

"use strict";

new Vue({
  el: "#app",
  data: {
    authenticated: null,
    authenticating: false,
    password: null,
    requiresPassword: null,

    clients: null,
    clientDelete: null,
    clientCreate: null,
    clientCreateName: "",
    clientEditName: null,
    clientEditNameId: null,
    clientEditAddress: null,
    clientEditAddressId: null,
    qrcode: null,

    lastTransfer: new Map(),
    useBit: localStorage.useBit === "true" || false,
    highPrecisionDecimal: localStorage.highPrecisionDecimal === "true" || false,

    settings: null,
    darkTheme:
      localStorage.dark === "true" ||
      (!("dark" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),

    currentRelease: null,
    latestRelease: null,
  },
  methods: {
    dateTime: (value) => {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(value);
    },
    async refresh() {
      if (!this.authenticated) return;

      const clients = await this.api.getClients();
      this.clients = clients.map((client) => {
        // if (client.name.includes("@") && client.name.includes(".")) {
        //   client.avatar = `https://www.gravatar.com/avatar/${md5(
        //     client.name
        //   )}?d=blank`;
        // }
        client.downloadSpeed = this.lastTransfer.get(client.id)?.timestamp
          ? ((client.transferTx -
              this.lastTransfer.get(client.id)?.transferTx) *
              1000) /
            (client.timestamp - this.lastTransfer.get(client.id)?.timestamp)
          : 0;
        client.uploadSpeed = this.lastTransfer.get(client.id)?.timestamp
          ? ((client.transferRx -
              this.lastTransfer.get(client.id)?.transferRx) *
              1000) /
            (client.timestamp - this.lastTransfer.get(client.id)?.timestamp)
          : 0;
        this.lastTransfer.set(client.id, {
          transferTx: client.transferTx,
          transferRx: client.transferRx,
          timestamp: client.timestamp,
        });
        return client;
      });

      console.log(clients);
    },
    login(e) {
      e.preventDefault();

      if (!this.password) return;
      if (this.authenticating) return;

      this.authenticating = true;
      this.api
        .createSession({
          password: this.password,
        })
        .then(async () => {
          const session = await this.api.getSession();
          this.authenticated = session.authenticated;
          this.requiresPassword = session.requiresPassword;
          return this.refresh();
        })
        .catch((err) => {
          alert(err.message || err.toString());
        })
        .finally(() => {
          this.authenticating = false;
        });
    },
    logout(e) {
      e.preventDefault();

      this.api
        .deleteSession()
        .then(() => {
          this.authenticated = false;
          this.clients = null;
        })
        .catch((err) => {
          alert(err.message || err.toString());
        });
    },
    createClient() {
      const name = this.clientCreateName;
      if (!name) return;

      this.api
        .createClient({ name })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    deleteClient(client) {
      this.api
        .deleteClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    enableClient(client) {
      this.api
        .enableClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    disableClient(client) {
      this.api
        .disableClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updateClientName(client, name) {
      this.api
        .updateClientName({ clientId: client.id, name })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updateClientAddress(client, address) {
      this.api
        .updateClientAddress({ clientId: client.id, address })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    //customized / added
    toggleDark() {
      this.darkTheme = !this.darkTheme;
      localStorage.setItem("dark", this.darkTheme);
      this.setTheme(this.darkTheme);
    },
    setTheme(isDark) {
      isDark
        ? document.documentElement.classList.add("dark")
        : document.documentElement.classList.remove("dark");
    },
    toggleUseBit() {
      this.useBit = !this.useBit;
      localStorage.setItem("useBit", this.useBit);
    },
    toggleHighPrecisionDecimal() {
      this.highPrecisionDecimal = !this.highPrecisionDecimal;
      localStorage.setItem("highPrecisionDecimal", this.highPrecisionDecimal);
    },
  },
  filters: {
    timeago: (value) => {
      return timeago().format(value);
    },
    bytes: (bytes, maxunit) => {
      let useBit = localStorage.useBit === "true" || false;
      if (useBit) bytes *= 8;
      let decimals =
        localStorage.highPrecisionDecimal === "true" || false ? 6 : 2;
      if (bytes === 0) {
        return useBit ? "0 b" : "0 B";
      }
      if (Number.isNaN(parseFloat(bytes)) && !Number.isFinite(bytes))
        return "Not a number";
      const k = 1000;
      const dm =
        decimals != null && !Number.isNaN(decimals) && decimals >= 0
          ? decimals
          : 2;
      const sizes = useBit
        ? ["b", "Kb", "Mb", "Gb", "Tb", "Pb", "Eb", "Zb", "Yb", "Bb"]
        : ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB", "BB"];
      let i = Math.floor(Math.log(bytes) / Math.log(k));
      if (maxunit !== undefined) {
        const index = sizes.indexOf(maxunit);
        if (index !== -1) i = index;
      }
      // eslint-disable-next-line no-restricted-properties
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },
  },
  mounted() {
    this.api = new API();
    this.api
      .getSession()
      .then((session) => {
        this.authenticated = session.authenticated;
        this.requiresPassword = session.requiresPassword;
        this.refresh().catch((err) => {
          alert(err.message || err.toString());
        });
      })
      .catch((err) => {
        alert(err.message || err.toString());
      });

    setInterval(() => {
      this.refresh().catch(console.error);
    }, 1000);

    Promise.resolve()
      .then(async () => {
        const currentRelease = await this.api.getRelease();
        const latestRelease = await fetch(
          "https://raw.githubusercontent.com/jovanshelomo/wg-easy-improved/main/docs/changelog.json"
        )
          .then((res) => res.json())
          .then((releases) => {
            const releasesArray = Object.entries(releases).map(
              ([version, changelog]) => ({
                version: parseInt(version, 10),
                changelog,
              })
            );
            releasesArray.sort((a, b) => {
              return b.version - a.version;
            });

            return releasesArray[0];
          });

        console.log(`Current Release: ${currentRelease}`);
        console.log(`Latest Release: ${latestRelease.version}`);

        if (currentRelease >= latestRelease.version) return;

        this.currentRelease = currentRelease;
        this.latestRelease = latestRelease;
      })
      .catch(console.error);

    //dark theme
    this.setTheme(this.darkTheme);
  },
});
