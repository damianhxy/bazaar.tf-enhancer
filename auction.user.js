// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Calculates value of trade items
// @downloadURL         https://github.com/damianhxy/Auction-Helper/raw/master/auction.user.js
// @grant               GM_xmlhttpRequest
// @include             /^https?:\/\/bazaar\.tf.*/
// @name                Bazaar Trade Value
// @namespace           localhost
// @run-at              document-end
// @version             1.4.0.7
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var updateFreq = 3;              //(days) price refresh frequency
    /******** END OF SETTINGS *******/

    function annotate(trade) {
        for (var a = 0; a < trade.length; a++) {
            if (+trade[a].getAttribute("data-defindex") < 0)
                continue;
            if (trade[a].getAttribute("data-game") !== "440")
                continue;
            var price = getPrice(trade[a]),
                text = "",
                name = trade[a].getAttribute("data-name"),
                details = trade[a].getAttribute("data-details");
            if (+price[0] % 1 * 10 >= 0.5 && !price[2])
                price[0] -= 0.005;
            price[0] = price[0].toFixed(2);
            if (trade[a].hasAttribute("data-notes")) {
                var notes = trade[a].getAttribute("data-notes"),
                    count = notes.match(/<\\\/p>/g).length;
                if (notes.contains("Gifted"))  {
                    trade[a].innerHTML += "<i class='fa fa-gift fa-inverse fa-border pull-left'></i>";
                    count--;
                }
                if (notes.contains("Painted:") && !notes.contains(name)) {
                    trade[a].innerHTML += "<i class='fa fa-paint-brush fa-inverse fa-border pull-left'></i>";
                    count--;
                }
                if (notes.contains("Crafted"))
                    count--;
                if (notes.contains("Not Craftable"))
                    count--;
                if (trade[a].className.contains("q11") && count > 1) //Will break on stranges with spells
                    trade[a].innerHTML += "<i class='fa fa-cogs fa-inverse fa-border pull-left'></i>";
            }
            if (name.contains("Australium"))
                trade[a].innerHTML += "<i class='fa fa-money fa-inverse fa-border pull-left'></i>";
            var isKillstreak = details.contains("Killstreak"),
                isLowCraft = trade[a].getAttribute("data-special") === "Low craft #";
            if (!+price[0]) {
                if (isLowCraft) {
                    trade[a].innerHTML += "<i class='fa fa-exclamation-triangle fa-inverse fa-border pull-left'></i>";
                    text = "#" + trade[a].getAttribute("data-craft") + ": ";
                }
                if (isKillstreak) {
                    var colour;
                    if (details.contains("Professional"))
                        colour = "#ffd700";
                    else if (details.contains("Specialized"))
                        colour = "#c0c0c0";
                    else
                        colour = "#cd7f32";
                    trade[a].innerHTML += "<i class='fa fa-bomb fa-border pull-left' " +
                                         "style='color: " + colour + "; background-color: white'></i>";
                }
                text += "Unpriced";
            }
            else if (name.contains("Metal"))
                text += (+price[0]).toFixed(2) + " Refined";
            else if (name.contains("Key"))
                text += keyP.toFixed(2) + " Refined";
            else if (name.contains("Earbud"))
                text += budP.toFixed(2) + " Keys";
            else {
                if (trade[a].hasAttribute("data-crate"))
                    text = "#" + trade[a].getAttribute("data-crate") + ": ";
                if (trade[a].hasAttribute("data-price"))
                    var currency = trade[a].getAttribute("data-price").split(" ")[1];
                if (price[1] === "Crate")
                    text += "0.01 Refined";
                else if (currency.contains("Weapon"))
                    text += "Any Weapon";
                else if (currency.contains("Key") || currency.contains("Earbud"))
                    text += (+price[1]).toFixed(2) + " " + currency;
                else
                    text += (+price[0]).toFixed(2) + " " + currency;
            }
            var txt = document.createElement("span");
            txt.setAttribute("class", "item-text");
            txt.setAttribute("style", "bottom: 0; left: 0; right: 0;");
            txt.innerHTML = text;
            trade[a].appendChild(txt);
        }
    }

    function calc(trade) {
        var total = 0,
            allPure = true;
        for (var a = 0; a < trade.length; a++) {
            var response = getPrice(trade[a]);
            total += +response[0];
            if (!response[3])
                allPure = false;
        }
        if (!allPure) {
            total = round(total);
            if (total % 1 * 10 >= 0.5)
                total -= 0.005;
        }
        total = total.toFixed(2);
        var string = (!allPure && +total ? "~" : "") + total + " Refined";
        if (total > keyP)
            string += "/ " + (total / keyP).toFixed(2) + " Keys";
        if (total > keyP * budP)
            string += "/ " + (total / (keyP * budP)).toFixed(2) + " Buds";
        string += " in " + trade.length + " item" + (trade.length === 1 ? "" : "s");
        return string;
    }

    function getPrice(ele) {
        var price = 0,
            original = 0,
            hasRange = false,
            isPure = false,
            name = ele.getAttribute("data-name");
        if (ele.hasAttribute("data-price")) {
            var data = ele.getAttribute("data-price").split(" ");
            price = original = +data[0];
            if (data[0] === "Any")
                price = 1 / 18;
            else if (data[0].contains("-")) {
                var pts = data[0].split("-");
                price = original = (+pts[0] + +pts[1]) / 2;
                hasRange = true;
            }
            if (data[1].contains("Key"))
                price *= keyP;
            else if (data[1].contains("Earbud"))
                price *= keyP * budP;
            else if (name.contains("Token")) {
                price = 3 / 2;
                isPure = true;
            }
            else if (!hasRange)
                price = round(price);
        }
        else {
            isPure = true;
            switch (name) {
                case "Refined Metal":
                    price = 1;
                    break;
                case "Reclaimed Metal":
                    price = 1 / 3;
                    break;
                case "Scrap Metal":
                    price = 1 / 9;
                    break;
                default:
                    isPure = false;
                    if (name.contains("Crate") || name.contains("Reel")) {
                        price = 1 / 90;
                        original = "Crate";
                    }
            }
        }
        return [price, original, hasRange, isPure];
    }

    function round(num) {
        var val;
        if (num <= 5 / 90)
            val = Math.round(num * 90) / 90;
        else
            val = Math.floor(num) + (Math.round(num % 1 * 9)) / 9;
        return val;
    }

    function timeUpdate() {
        var lastUpdt = Date.parse(localStorage.getItem("lastupdt")),
            curTime = new Date(),
            diff = 864e5 * updateFreq - (curTime - lastUpdt),
            days = Math.floor(diff / 864e5),
            hours = Math.floor((diff % 864e5) / 36e5),
            minutes = Math.floor((diff % 36e5) / 6e4),
            str = "Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " minute(s).";
        return str;
    }

    function update() {
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API Key not set, get yours from http://backpack.tf/api/ and enter below"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Invalid API Key");
            localStorage.removeItem("apikey");
            update();
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.apikey + "&compress=1",
            onload: function(e) {
                var data = JSON.parse(e.response);
                if (!data)
                    alert("API Error: Empty Response");
                else if (data.response.message)
                    alert(data.response.message);
                var key = data.response.items["Mann Co. Supply Crate Key"]["prices"][6]["Tradable"]["Craftable"][0],
                    bud = data.response.items["Earbuds"]["prices"][6]["Tradable"]["Craftable"][0],
                    k = key.value_high ? ((key.value + key.value_high) / 2) : key.value,
                    b = bud.value_high ? ((bud.value + bud.value_high) / 2) : bud.value,
                    kOld = +localStorage.getItem("keyP"),
                    bOld = +localStorage.getItem("budP"),
                    kChange = " (" + (k === kOld ? "=" : (k < kOld ? "↓" : "↑")) + ")",
                    bChange = " (" + (b === bOld ? "=" : (b < bOld ? "↓" : "↑")) + ")";
                    localStorage.setItem("keyP", k);
                    localStorage.setItem("budP", b);
                    alert("Updated Prices, Key: " + k + " refined" + kChange + ", Bud: " + b + " keys" + bChange);
                    localStorage.setItem("lastupdt", new Date());
            }
        });
    }

    if (!localStorage.getItem("keyP") || !localStorage.getItem("budP"))
        update();
    else if (!localStorage.getItem("lastupdt") || (new Date() - Date.parse(localStorage.getItem("lastupdt")) >= 86400e3 * updateFreq))
        update();

    var keyP = +localStorage.getItem("keyP"),
        budP = +localStorage.getItem("budP"),
        cNo = document.getElementsByClassName("item-number"),
        ks = document.getElementsByClassName("ks");
    for (var a = 0; a < cNo.length; a++)
        cNo[a].style.display = "none";
    for (var a = 0; a < ks.length; a++)
        ks[a].style.display = "none";

    if (!document.getElementsByClassName("fa-reply").length) {
        var trades = document.querySelectorAll("div[id^='trade-']");
        for (var a = 0; a < trades.length; a++) {
            var items = trades[a].children[1].children;
            annotate(items[0].children);
            annotate(items[2].children);
        }
    }
    else if (!document.getElementsByClassName("fa-legal").length) {
        annotate(document.getElementsByClassName("offered-items")[0].children);
        annotate(document.getElementsByClassName("wanted-items")[0].children);
        var offers = document.getElementsByClassName("comment-offers");
        for (var a = 0; a < offers.length; a++)
            annotate(offers[a].firstElementChild.children);
    }
    else {
        var data = document.createElement("li"),
            itms = document.getElementsByClassName("offered-items")[0].children,
            text = document.createTextNode(calc(itms));
        annotate(itms);
        data.setAttribute("style", "color: orange;");
        data.appendChild(text);
        document.getElementsByClassName("trade-stats")[0].appendChild(data);

        var offers = document.getElementsByClassName("comment-offers");
        for (var a = 0; a < offers.length; a++) {
            var data = document.createElement("span"),
                itms = offers[a].firstElementChild.children,
                text = document.createTextNode(calc(itms));
            annotate(itms);
            data.setAttribute("style", "color: orange; float: right;");
            data.appendChild(text);
            var notes = offers[a].previousElementSibling.lastElementChild;
            notes.insertBefore(data, notes.firstElementChild);
        }

        var retracted = document.getElementsByClassName("btn-warning accept-bid-btn disabled");
        for (var a = 0; a < retracted.length; a++)
            retracted[a].parentNode.parentNode.parentNode.parentNode.style.borderColor = "orange";
    }
    console.info("Bazaar.tf Script Loaded. Version " + GM_info.script.version);
    console.info(timeUpdate());
}).call(this);