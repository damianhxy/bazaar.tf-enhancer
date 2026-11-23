// ==UserScript==
// @copyright           ©2014-2026, Damian Ho
// @description         Helper script for Bazaar.tf
// @downloadURL         https://raw.githubusercontent.com/damianhxy/bazaar.tf-enhancer/master/auction.user.js
// @connect             backpack.tf
// @grant               GM_info
// @grant               GM_xmlhttpRequest
// @homepageURL         https://github.com/damianhxy/bazaar.tf-enhancer
// @match               https://bazaar.tf/*
// @name                Bazaar.tf Enhancer
// @namespace           https://github.com/damianhxy
// @noframes
// @run-at              document-end
// @supportURL          https://github.com/damianhxy/bazaar.tf-enhancer/issues
// @updateURL           https://raw.githubusercontent.com/damianhxy/bazaar.tf-enhancer/master/auction.user.js
// @version             1.6.1
// ==/UserScript==

(function () {
    "use strict";
    /*********** SETTINGS ***********/
    const updateFreq = 3;              //[days] price refresh frequency
    /******** END OF SETTINGS *******/

    function annotate(trade) {
        [...trade].forEach(e => {
            if (+e.getAttribute("data-defindex") < 0 || e.getAttribute("data-game") !== "440")
                return;
            const price = getPrice(e);
            let text = "";
            const name = e.getAttribute("data-name"),
                details = e.getAttribute("data-details") || "",
                extra = e.querySelector(".item-number"),
                specialText = e.getAttribute("data-special") === "Low Craft #" || details.includes("Killstreak");
            if (extra && !extra.textContent.includes("x"))
                extra.remove();
            const ks = e.querySelector(".ks");
            if (ks)
                ks.remove();
            price[0] = trunc(round(+price[0]));
            if (e.hasAttribute("data-crate"))
                text = `#${e.getAttribute("data-crate")}: `;
            if (specialText) {
                if (e.getAttribute("data-special") === "Low Craft #")
                    text = `Lowcraft #${e.getAttribute("data-craft")}`;
                if (details.includes("Killstreak")) {
                    let colour = "darkgoldenrod";
                    if (details.includes("Specialized"))
                        colour = "darkgray";
                    else if (details.includes("Professional"))
                        colour = "gold";
                    e.appendChild(createIcon("bomb", `color: ${colour}; background-color: white;`));
                    text = "Killstreak";
                }
            } else if (name.includes("Metal"))
                text = `${price[0]} Refined`;
            else if (price[0]) {
                const currency = e.getAttribute("data-price").split(" ")[1];
                if (currency.includes("Weapon"))
                    text += "Any Weapon";
                else if (currency.includes("Key"))
                    text += `${price[1].toFixed(2)} ${currency}`;
                else
                    text += `${price[0]} ${currency}`;
            } else
                text += "Unpriced";
            if (e.hasAttribute("data-notes")) {
                const notes = e.getAttribute("data-notes");
                let count = notes.match(/<\\\/p>/g).length;
                if (notes.includes("Gifted"))
                    e.appendChild(createIcon("gift"));
                if (notes.includes("Painted:") && !notes.includes(name))
                    e.appendChild(createIcon("paint-brush"));
                count -= (notes.match(/Tradable|(?:Craft|Gift|Paint|Festiviz)ed/g) || "").length;
                if (e.classList.contains("q11-440") && count > 1)
                    e.appendChild(createIcon("cogs"));
            }
            if (e.hasAttribute("data-spells")) {
                const spell = e.querySelector(".spell");
                if (spell) spell.remove();
                e.appendChild(createIcon("moon-o"));
            }
            const txt = document.createElement("span");
            txt.classList.add("item-text");
            txt.style = "bottom: 0; left: 0; right: 0;";
            txt.appendChild(document.createTextNode(text));
            e.appendChild(txt);
        });
    }

    function calc(trade) {
        let total = 0,
            allPure = true;
        [...trade].forEach(e => {
            const response = getPrice(e);
            total += response[0];
            allPure = allPure && response[3];
        });
        total = trunc(round(total));
        let string = `${total && !allPure ? "~" : ""} ${total} Refined`;
        if (total > +keyP.toFixed(2))
            string += `/ ${(total / keyP).toFixed(2)} Keys`;
        return string;
    }

    function check(predicate, callback) {
        predicate() ? callback() : setTimeout(() => check(predicate, callback), 500);
    }

    function createIcon(cls, style) {
        const icon = document.createElement("i");
        icon.classList.add("fa", `fa-${cls}`, "fa-inverse", "fa-border", "pull-left");
        icon.style = `border-radius: 50%;${style ? " " + style : ""}`;
        return icon;
    }

    function getAPIPrice(name) {
        const data = JSON.parse(localStorage.getItem("prices"));
        let item = data.response.items[name];
        if (!item)
            item = data.response.items[`Strange Part: ${name}`];
        if (!item)
            item = data.response.items[`Strange Cosmetic Part: ${name}`];
        if (!item)
            return 0;
        const obj = item.prices[6].Tradable.Craftable[0];

        let value = obj.value;
        if (obj.currency === "keys")
            value *= keyP;
        return value;
    }

    function getPrice(ele) {
        let price = 0,
            original = 0,
            hasRange = false,
            isPure = false;
        const name = ele.getAttribute("data-name");
        if (ele.hasAttribute("data-price")) {
            const data = ele.getAttribute("data-price").split(" ");
            if (data[0] === "Any")
                price = 1 / 18;
            else if (data[0].includes("-")) {
                const pts = data[0].split("-");
                price = original = (+pts[0] + +pts[1]) / 2;
                hasRange = true;
            } else
                price = original = +data[0];
            if (name.match(/(?:Key|(?:Slot|Class) Token)/))
                isPure = true;
            if (data[1].includes("Key"))
                price *= keyP;
            else if (name.match(/(?:Slot|Class) Token/))
                price = 1 / 6;
            if (!isPure && !hasRange)
                price = round(price);
        } else {
            const index = ["Refined", "Reclaimed", "Scrap"].findIndex(e => `${e} Metal` === name);
            if (index !== -1) {
                isPure = true;
                price = 1 / Math.pow(3, index);
            }
        }
        return [price, original, hasRange, isPure];
    }

    function round(num) {
        if (num <= 5 / 90)
            return num;
        num += num * 10 % 1 / 90;
        return Math.floor(num) + Math.round((num % 1 * 9).toFixed(2)) / 9;
    }

    function trunc(num) {
        return Math.floor(num * 100) / 100;
    }

    function createSummary(txt, parent) {
        const paints = {},
            parts = {};
        txt.style.cursor = "pointer";
        [...parent.querySelectorAll("[data-paint]")].forEach(e => {
            const name = e.getAttribute("data-notes").split("<\\\/p>")[0].slice(13);
            if (name !== e.getAttribute("data-name"))
                paints[name] = (paints[name] || 0) + 1;
        });
        [...parent.querySelectorAll(".fa-cogs")].forEach(e => {
            const itemParts = e.parentNode.getAttribute("data-notes").match(/<p>.+?:/g).slice(1)
                .map(f => f.substr(3, f.length - 4));
            itemParts.forEach(f => {
                if (f !== "Points Scored") // In case strange cosmetic is painted
                    parts[f] = (parts[f] || 0) + 1;
            });
        });
        txt.addEventListener("click", () => {
            let msg = "";
            let paintValue = 0;
            msg += `Painted: ${Object.keys(paints).length}\n`;
            for (const paint in paints) {
                msg += `[${("0" + paints[paint]).slice(-2)}] ${paint}\n`;
                paintValue += getAPIPrice(paint) * paints[paint];
            }
            msg += `Total paint value: ${trunc(round(paintValue / 2))} Refined\n`;
            msg += `Killstreaked: ${parent.getElementsByClassName("fa-bomb").length}\n`;
            msg += `Parted: ${parent.getElementsByClassName("fa-cogs").length} [Parts: ${Object.keys(parts).length}]\n`;
            let partValue = 0;
            for (const part in parts) {
                msg += `[${("0" + parts[part]).slice(-2)}] ${part}\n`;
                partValue += getAPIPrice(part) * parts[part];
            }
            msg += `Total part value: ${trunc(round(partValue / 2))} Refined\n`;
            msg += `Gifted: ${parent.querySelectorAll(".fa-gift").length}\n`;
            msg += `Spelled: ${parent.querySelectorAll("[data-spells]").length}\n`;
            msg += `Uncraftable: ${parent.querySelectorAll("[data-flag_cannot_craft]").length}\n`;
            msg += `Untradable: ${parent.querySelectorAll("[data-flag_cannot_trade]").length}\n`;
            msg += `Item Count: ${parent.childElementCount}\n`;
            alert(msg);
        });
    }

    function update() {
        if (document.getElementById("UserLoginForm"))
            return console.info(`Bazaar.tf Script Paused (Signed Out). Version ${GM_info.script.version}`);
        let apiKey = localStorage.getItem("apikey");
        if (!apiKey) {
            apiKey = prompt("API key not set, register yours from https://backpack.tf/developer/");
            if (!apiKey) return;
            localStorage.setItem("apikey", apiKey);
        }
        if (apiKey.length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            return;
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://backpack.tf/api/IGetPrices/v4/?key=${apiKey}`,
            onload: e => {
                const data = JSON.parse(e.response);
                if (!data.response.success)
                    return console.info(`Error:\n${data.response.message}`);
                localStorage.setItem("prices", e.response);
                const key = data.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0],
                    k = (key.value + (key.value_high || key.value)) / 2,
                    kDiff = ` (${k === keyP ? "=" : k < keyP ? "↓" : "↑"})`,
                    firstRun = !keyP;
                localStorage.setItem("keyP", k);
                console.info(`Prices updated, Keys: ${k} Refined ${kDiff}`);
                localStorage.setItem("lastupdt", Date.now());
                keyP = k;
                if (firstRun) {
                    try {
                        run();
                    } catch (err) {
                        fatal(err);
                    }
                }
            }
        });
    }

    function fatal(e) {
        alert(`[A fatal error has occurred]\n${e.message}\n[Stack Trace]\n${e.stack}`);
    }

    function run() {
        const tradeView = document.querySelector(".fa-reply"),
            tradeList = document.querySelector(".fa-share"),
            backpack = /^https:\/\/bazaar\.tf\/backpack\/\d{17}$/.test(document.URL);
        if (backpack)
            check(() => !document.querySelector(".fa-spinner"),
                  () => annotate(document.querySelectorAll(".item:not(.placeholder-icon)")));
        else if (tradeList || tradeView)
            annotate(document.getElementsByClassName("item"));
        if (tradeList) {
            [...document.querySelectorAll("[data-type='more-items-icon']")].forEach(e => {
                const parent = e.parentNode;
                e.addEventListener("click", () => {
                    check(() => !document.querySelector(".progress"),
                          () => annotate(parent.children));
                });
            });
        } else if (tradeView) {
            const data = document.createElement("li"),
                offered = document.querySelector(".offered-items");
            data.style.color = "orange";
            data.appendChild(document.createTextNode(calc(offered.children)));
            createSummary(data, offered);
            document.querySelector(".trade-stats").appendChild(data);
            [...document.querySelectorAll("[id^='thread-']")].forEach(e => {
                if (e.querySelector(".comment-offers")) {
                    const data = document.createElement("span"),
                        offered = e.querySelector(".item-list"),
                        notes = e.querySelector(".comment-content:not(.top-small-margin)");
                    data.style = "color: orange; float: right;";
                    data.appendChild(document.createTextNode(calc(offered.children)));
                    createSummary(data, offered);
                    notes.insertBefore(data, notes.firstChild);
                }
                if (e.querySelector(".btn-success.disabled"))
                    e.firstElementChild.style.borderColor = "lime";
                else if (e.querySelector(".btn-warning.disabled"))
                    e.firstElementChild.style.borderColor = "orange";
            });
        }
        console.info(`Bazaar.tf Script Loaded. Version ${GM_info.script.version}`);
    }

    let keyP;
    let lastUpdt;

    try {
        /******** SCRIPT GLOBALS ********/
        keyP = +localStorage.getItem("keyP");
        lastUpdt = Date.now() - (+localStorage.getItem("lastupdt") || 0);
        /****** END SCRIPT GLOBALS ******/

        if (!keyP || lastUpdt >= 864e5 * updateFreq) {
            update();
        } else {
            const diff = 864e5 * updateFreq - lastUpdt,
                days = Math.floor(diff / 864e5),
                hours = Math.floor((diff % 864e5) / 36e5),
                minutes = Math.floor((diff % 36e5) / 6e4);
            console.info(`Prices will update in ${days} day(s), ${hours} hour(s) and ${minutes} min(s)`);
        }

        // Without a cached key price nothing priced in keys can be valued; annotate once the first download lands
        if (keyP)
            run();
    } catch (e) {
        fatal(e);
    }
})();
