// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Helper script for Bazaar.tf
// @downloadURL         https://github.com/damianhxy/Auction-Helper/raw/master/auction.user.js
// @grant               GM_xmlhttpRequest
// @include             /^http:\/\/bazaar\.tf.*/
// @name                Bazaar.tf Enhancer
// @namespace           localhost
// @noframes
// @run-at              document-end
// @version             1.4.3.9
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var updateFreq = 3,              //[days] price refresh frequency
        excludeCrates = 1,           //[boolean] exclude cheap crates?
        highlighting = 1;            //[boolean] turn on offer highlighting?
    /******** END OF SETTINGS *******/

    function annotate(trade) {
        Array.prototype.forEach.call(trade, function(e) {
            if (+e.getAttribute("data-defindex") < 0 || e.getAttribute("data-game") !== "440")
                return;
            var price = getPrice(e),
                text = "",
                name = e.getAttribute("data-name"),
                details = e.getAttribute("data-details");
            if (price[0] * 100 % 1 >= 0.5 && !price[2])
                price[0] -= 0.005;
            price[0] = +price[0].toFixed(2);
            if (e.hasAttribute("data-notes")) {
                var notes = e.getAttribute("data-notes"),
                    count = notes.match(/<\\\/p>/g).length;
                if (notes.contains("Gifted"))
                    e.insertAdjacentHTML("beforeend", "<i class='fa fa-gift fa-inverse fa-border pull-left'></i>");
                if (notes.contains("Painted:") && !notes.contains(name))
                    e.insertAdjacentHTML("beforeend", "<i class='fa fa-paint-brush fa-inverse fa-border " +
                                         "pull-left'></i>");
                count -= (notes.match(/(Craft|Trad|Paint|Gift)(able|ed)/g) || "").length;
                if (e.className.contains("q11") && count > 1)
                    e.insertAdjacentHTML("beforeend", "<i class='fa fa-cogs fa-inverse fa-border pull-left'></i>");
            }
            if (name.contains("Australium"))
                e.insertAdjacentHTML("beforeend", "<i class='fa fa-money fa-inverse fa-border pull-left'></i>");
            if (e.hasAttribute("data-crate"))
                text = "#" + e.getAttribute("data-crate") + ": ";
            if (excludeCrates && price[1] === "exclude") {
                text += "Excluded";
            }
            else if (!price[0]) {
                if (e.getAttribute("data-special") === "Low craft #") {
                    e.insertAdjacentHTML("beforeend", "<i class='fa fa-exclamation-triangle fa-inverse " +
                                         "fa-border pull-left'>" + " #" + e.getAttribute("data-craft") + "</i>");
                    text = "↓#: ";
                }
                if (details.contains("Killstreak")) {
                    var colour = "#cd7f32";
                    if (details.contains("Specialized"))
                        colour = "#c0c0c0";
                    else if (details.contains("Professional"))
                        colour = "#ffd700";
                    e.insertAdjacentHTML("beforeend", "<i class='fa fa-bomb fa-border pull-left' " +
                                         "style='color: " + colour + "; background-color: white'></i>");
                    text = "KS: ";
                }
                text += "Unpriced";
            }
            else if (name.contains("Metal"))
                text = price[0] + " Refined";
            else if (name.contains("Key"))
                text = +keyP.toFixed(2) + " Refined";
            else if (name.contains("Earbud"))
                text = +budP.toFixed(2) + " Keys";
            else if (price[1] === "crate")
                text += "0.01 Refined";
            else {
                var currency = e.getAttribute("data-price").split(" ")[1];
                if (currency.contains("Weapon"))
                    text += "Any Weapon";
                else if (currency.contains("Key") || currency.contains("Earbud"))
                    text += +price[1].toFixed(2) + " " + currency;
                else
                    text += price[0] + " " + currency;
            }
            var txt = document.createElement("span"),
                content = document.createTextNode(text);
            txt.setAttribute("class", "item-text");
            txt.setAttribute("style", "bottom: 0; left: 0; right: 0;");
            txt.appendChild(content);
            e.appendChild(txt);
        });
    }

    function calc(trade) {
        var total = 0,
            allPure = true;
        Array.prototype.forEach.call(trade, function(e) {
            var response = getPrice(e);
            total += response[0];
            if (allPure)
                allPure &= response[3];
        });
        if (!allPure) {
            total = round(total);
            if (total * 100 % 1 >= 0.5)
                total -= 0.005;
        }
        total = +total.toFixed(2);
        var string = (!allPure && total ? "~" : "") + total + " Refined";
        if (total > +(keyP).toFixed(2)) {
            string += "/ " + (total / keyP).toFixed(2) + " Keys";
            if (total > +(keyP * budP).toFixed(2))
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
            if (name.contains("Key") || name.contains("Earbud"))
                isPure = true;
            if (data[1].contains("Key"))
                price *= keyP;
            else if (data[1].contains("Earbud"))
                price *= keyP * budP;
            else if (name.contains("Token")) {
                price = 1 / 6;
                isPure = true;
            }
            else if (!hasRange)
                price = round(price);
        }
        else {
            isPure = true;
            if (name === "Refined Metal")
                price = 1;
            else if (name === "Reclaimed Metal")
                price = 1 / 3;
            else if (name === "Scrap Metal")
                price = 1 / 9;
            else
                if (ele.hasAttribute("data-crate")) {
                    isPure = false;
                    price = 1 / 90;
                    original = "crate";
            }
        }
        if (excludeCrates) {
            if (ele.hasAttribute("data-crate") || ele.getAttribute("data-name").contains("Crate")) {
                if (price <= 5 / 90) {
                    isPure = false;
                    original = "exclude";
                }
            }
        }
        return [price, original, hasRange, isPure];
    }

    function round(num) {
        var val = +num;
        if (num > 5 / 90)
            val = Math.floor(val) + (Math.round(val % 1 * 9)) / 9;
        return val;
    }

    function update() {
        if (document.getElementById("login"))
            console.info("Backpack.tf Script Paused. Version " + GM_info.script.version);
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register yours from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            update();
        }
        if (!localStorage.getItem("keyP") || !localStorage.getItem("budP") ||
            (new Date() - (Date.parse(localStorage.getItem("lastupdt")) || 0) >= 864e5 * updateFreq)) {
            GM_xmlhttpRequest({
                method: "GET",
                url: "http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.apikey,
                onload: function(e) {
                    var data = JSON.parse(e.response);
                    if (!data.response.success) {
                        if (data.response.message === "API key does not exist.") {
                            alert("Invalid API key");
                            localStorage.removeItem("apikey");
                            update();
                        }
                        else
                            alert("Error: " + data.response.message);
                    }
                    var key = data.response.items["Mann Co. Supply Crate Key"]["prices"][6]["Tradable"]["Craftable"][0],
                        bud = data.response.items["Earbuds"]["prices"][6]["Tradable"]["Craftable"][0],
                        k = (key.value + (key.value_high || key.value)) / 2,
                        b = (bud.value + (bud.value_high || bud.value)) / 2,
                        kDiff = " (" + (k === keyP ? "=" : (k < keyP ? "↓" : "↑")) + ")",
                        bDiff = " (" + (b === budP ? "=" : (b < budP ? "↓" : "↑")) + ")";
                    localStorage.setItem("keyP", k);
                    localStorage.setItem("budP", b);
                    alert("Prices updated, Keys: " + k + " Refined" + kDiff + ", Earbuds: " + b + " Keys" + bDiff);
                    localStorage.setItem("lastupdt", new Date());
                    location.reload();
                    return;
                }
            });
        }
        var diff = 864e5 * updateFreq - (new Date() - Date.parse(localStorage.getItem("lastupdt"))),
            days = Math.floor(diff / 864e5),
            hours = Math.floor((diff % 864e5) / 36e5),
            minutes = Math.floor((diff % 36e5) / 6e4);
        console.info("Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " min(s)");
    }

try {
    /******** SCRIPT GLOBALS ********/
    var tradeView = document.getElementsByClassName("fa-reply").length,
        tradeList = document.getElementsByClassName("fa-share").length,
        isAuction = document.getElementsByClassName("fa-legal").length,
        keyP = +localStorage.getItem("keyP"),
        budP = +localStorage.getItem("budP");
    update();
    /****** END SCRIPT GLOBALS ******/

    Array.prototype.forEach.call(document.getElementsByClassName("item-number"), function(e) {
        e.style.display = "none";
    });
    Array.prototype.forEach.call(document.getElementsByClassName("ks"), function(e) {
        e.style.display = "none";
    });

    if (tradeList) {
        Array.prototype.forEach.call(document.querySelectorAll("div[id^='trade-']"), function(e) {
            annotate(e.querySelector(".offered-items").children);
            if (!e.querySelector(".fa-legal"))
                annotate(e.querySelector(".wanted-items").children);
        });
    }
    else if (!isAuction && tradeView) {
        annotate(document.querySelector(".offered-items").children);
        annotate(document.querySelector(".wanted-items").children);
        Array.prototype.forEach.call(document.getElementsByClassName("comment-offers"), function(e) {
            annotate(e.firstElementChild.children);
        });
    }
    else if (isAuction && tradeView) {
        var data = document.createElement("li"),
            itms = document.querySelector(".offered-items").children,
            text = document.createTextNode(calc(itms));
        annotate(itms);
        data.setAttribute("style", "color: orange;");
        data.appendChild(text);
        document.querySelector(".trade-stats").appendChild(data);

        Array.prototype.forEach.call(document.getElementsByClassName("comment-offers"), function(e) {
            var data = document.createElement("span"),
                itms = e.firstElementChild.children,
                text = document.createTextNode(calc(itms)),
                notes = e.previousElementSibling.lastElementChild;
            annotate(itms);
            data.setAttribute("style", "color: orange; float: right;");
            data.appendChild(text);
            notes.insertBefore(data, notes.firstElementChild);
        });

        if (highlighting) {
            Array.prototype.forEach.call(document.getElementsByClassName("btn-warning disabled"), function(e) {
                e.parentNode.parentNode.parentNode.parentNode.style.borderColor = "orange";
            });
            var accept = document.querySelector("btn-success disabled");
            if (accept)
                accept.parentNode.parentNode.parentNode.parentNode.style.borderColor = "lime";
        }
    }
    console.info("Bazaar.tf Script Loaded. Version " + GM_info.script.version);
}
catch(e) {
    alert("[An error has occured]\n" + e.message + "\n[Stack Trace]\n" + e.stack);
}
})();