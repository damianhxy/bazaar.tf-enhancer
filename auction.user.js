// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Calculates value of trade items
// @downloadURL         https://github.com/damianhxy/Auction-Helper/raw/master/auction.user.js
// @grant               GM_xmlhttpRequest
// @include             /^https?:\/\/bazaar\.tf.*/
// @name                Bazaar Trade Value
// @namespace           localhost
// @run-at              document-end
// @version             1.4.1.7
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var updateFreq = 3,              //[days] price refresh frequency
        highlighting = 1;            //[boolean] turn on offer highlighting?
    /******** END OF SETTINGS *******/

    //FUNCTION DECLARATIONS
    function annotate(trade) {
        for (var a = 0; a < trade.length; a++) {
            if (+trade[a].getAttribute("data-defindex") < 0 || trade[a].getAttribute("data-game") !== "440")
                continue;
            var price = getPrice(trade[a]),
                text = "",
                name = trade[a].getAttribute("data-name"),
                details = trade[a].getAttribute("data-details");
            if (price[0] % 1 * 10 >= 0.5 && !price[2])
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
                if (trade[a].className.contains("q11") && count > 1)
                    trade[a].innerHTML += "<i class='fa fa-cogs fa-inverse fa-border pull-left'></i>";
            }
            if (name.contains("Australium"))
                trade[a].innerHTML += "<i class='fa fa-money fa-inverse fa-border pull-left'></i>";
            if (trade[a].hasAttribute("data-crate"))
                text = "#" + trade[a].getAttribute("data-crate") + ": ";
            if (!+price[0]) {
                if (trade[a].getAttribute("data-special") === "Low craft #") {
                    trade[a].innerHTML += "<i class='fa fa-exclamation-triangle fa-inverse fa-border pull-left'></i>";
                    text = "#" + trade[a].getAttribute("data-craft") + ": ";
                }
                if (details.contains("Killstreak")) {
                    var colour = "#cd7f32";
                    if (details.contains("Specialized"))
                        colour = "#c0c0c0";
                    else if (details.contains("Professional"))
                        colour = "#ffd700";
                    trade[a].innerHTML += "<i class='fa fa-bomb fa-border pull-left' " +
                                          "style='color: " + colour + "; background-color: white'></i>";
                    text = "KS: ";
                }
                text += "Unpriced";
            }
            else if (name.contains("Metal"))
                text = price[0] + " Refined";
            else if (name.contains("Key"))
                text = keyP.toFixed(2) + " Refined";
            else if (name.contains("Earbud"))
                text = budP.toFixed(2) + " Keys";
            else if (price[1] === "crate")
                text += "0.01 Refined";
            else {
                var currency = trade[a].getAttribute("data-price").split(" ")[1];
                if (currency.contains("Weapon"))
                    text += "Any Weapon";
                else if (currency.contains("Key") || currency.contains("Earbud"))
                    text += price[1].toFixed(2) + " " + currency;
                else
                    text += price[0] + " " + currency;
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
        if (total > keyP) {
            string += "/ " + (total / keyP).toFixed(2) + " Keys";
            if (total > keyP * budP)
                string += "/ " + (total / (keyP * budP)).toFixed(2) + " Buds";
        }
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
            if (data[0] === "Any")
                price = 1 / 18;
            else if (data[0].contains("-")) {
                var pts = data[0].split("-");
                price = original = (+pts[0] + +pts[1]) / 2;
                hasRange = true;
            }
            else
                price = original = +data[0];
            if (data[1].contains("Key")) {
                price *= keyP;
                isPure = true;
            }
            else if (data[1].contains("Earbud")) {
                price *= keyP * budP;
                isPure = true;
            }
            else if (name.contains("Token")) {
                price = 1 / 6;
                isPure = true;
            }
            else if (!hasRange)
                price = round(price);
        }
        else {
            switch (name) {
                case "Refined Metal":
                    price = 1;
                    isPure = true;
                    break;
                case "Reclaimed Metal":
                    price = 1 / 3;
                    isPure = true;
                    break;
                case "Scrap Metal":
                    price = 1 / 9;
                    isPure = true;
                    break;
                default:
                    if (ele.hasAttribute("data-crate")) {
                        price = 1 / 90;
                        original = "crate";
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

    function update() {
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register one from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            update();
        }
        if (!localStorage.getItem("keyP") || !localStorage.getItem("budP") || (new Date() - (Date.parse(localStorage.getItem("lastupdt")) || 0) >= 864e5 * updateFreq)) {
            GM_xmlhttpRequest({
                method: "GET",
                url: "http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.apikey + "&compress=1",
                onload: function(e) {
                    var data = JSON.parse(e.response);
                    if (!data)
                        alert("Error: API returned empty response");
                    else if (!data.response.success) {
                        if (data.response.message === "API key does not exist.") {
                            alert("Invalid API key")
                            localStorage.removeItem("apikey");
                            update();
                        }
                        else
                            alert("Error occurred: " + data.response.message);
                    }
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
                    alert("Prices updated, Keys: " + k + " Refined" + kChange + ", Earbuds: " + b + " Keys" + bChange);
                    localStorage.setItem("lastupdt", new Date());
                }
            });
            location.reload();
        }
        var diff = 864e5 * updateFreq - (new Date() - Date.parse(localStorage.getItem("lastupdt"))),
            days = Math.floor(diff / 864e5),
            hours = Math.floor((diff % 864e5) / 36e5),
            minutes = Math.floor((diff % 36e5) / 6e4);
        console.info("Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " min(s)");
    }

    //START OF SCRIPT
try {
    /******** SCRIPT GLOBALS ********/
    update();
    var tradeView = document.getElementsByClassName("fa-reply").length,
        tradeList = document.getElementsByClassName("fa-share").length,
        isAuction = document.getElementsByClassName("fa-legal").length,
        keyP = +localStorage.getItem("keyP"),
        budP = +localStorage.getItem("budP");
    /****** END SCRIPT GLOBALS ******/

    var cNo = document.getElementsByClassName("item-number"),
        ks = document.getElementsByClassName("ks");
    for (var a = 0; a < cNo.length; a++)
        cNo[a].style.display = "none";
    for (var a = 0; a < ks.length; a++)
        ks[a].style.display = "none";

    if (tradeList) {
        var trades = document.querySelectorAll("div[id^='trade-']");
        for (var a = 0; a < trades.length; a++) {
            var items = trades[a].children[1].children;
            annotate(items[0].children);
            annotate(items[2].children);
        }
    }
    else if (!isAuction && tradeView) {
        annotate(document.getElementsByClassName("offered-items")[0].children);
        annotate(document.getElementsByClassName("wanted-items")[0].children);
        var offers = document.getElementsByClassName("comment-offers");
        for (var a = 0; a < offers.length; a++)
            annotate(offers[a].firstElementChild.children);
    }
    else if (isAuction && tradeView) {
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
                text = document.createTextNode(calc(itms)),
                notes = offers[a].previousElementSibling.lastElementChild;
            annotate(itms);
            data.setAttribute("style", "color: orange; float: right;");
            data.appendChild(text);
            notes.insertBefore(data, notes.firstElementChild);
        }

        if (highlighting) {
            var retract = document.getElementsByClassName("btn-warning accept-bid-btn disabled"),
                accept = document.getElementsByClassName("comment accepted");
            for (var a = 0; a < retract.length; a++)
                retract[a].parentNode.parentNode.parentNode.parentNode.style.borderColor = "orange";
            if (accept.length)
                accept[0].style.borderColor = "lime";
        }
    }
    console.info("Bazaar.tf Script Loaded. Version " + GM_info.script.version);
}
catch(e) {
    alert("[An error has occured]\n" + e.message + "\n[Stack Trace]\n" + e.stack);
}
})();