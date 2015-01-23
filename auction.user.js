// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Helper script for Bazaar.tf
// @downloadURL         https://bitbucket.org/damianhxy/bazaar.tf-enhancer/raw/master/auction.user.js
// @grant               GM_xmlhttpRequest
// @include             /^http:\/\/bazaar\.tf.*$/
// @name                Bazaar.tf Enhancer
// @namespace           https://bitbucket.org/damianhxy
// @noframes
// @run-at              document-end
// @version             1.4.7.8
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var updateFreq = 3;              //[days] price refresh frequency
    /******** END OF SETTINGS *******/

    function annotate(trade) {
        Array.prototype.forEach.call(trade, function(e) {
            if (+e.getAttribute("data-defindex") < 0 || e.getAttribute("data-game") !== "440")
                return;
            var price = getPrice(e),
                text = "",
                name = e.getAttribute("data-name"),
                details = e.getAttribute("data-details") || "";
            price[0] = Math.floor(round(+price[0]) * 100) / 100;
            if (e.hasAttribute("data-notes")) {
                var notes = e.getAttribute("data-notes"),
                    count = notes.match(/<\\\/p>/g).length;
                if (notes.contains("Gifted"))
                    e.appendChild(createIcon("gift"));
                if (notes.contains("Painted:") && !notes.contains(name))
                    e.appendChild(createIcon("paint-brush"));
                count -= (notes.match(/Tradable|(?:Craft|Gift|Paint)ed/g) || "").length;
                if (e.className.contains("q11") && count > 1)
                    e.appendChild(createIcon("cogs"));
            }
            if (name.contains("Australium") && !name.contains("Gold"))
                e.appendChild(createIcon("money"));
            if (e.hasAttribute("data-crate"))
                text = "#" + e.getAttribute("data-crate") + ": ";
            if (!price[0]) {
                if (e.getAttribute("data-special") === "Low craft #")
                    text = "Lowcraft #" + e.getAttribute("data-craft");
                if (details.contains("Killstreak")) {
                    var colour = "#cd7f32";
                    if (details.contains("Specialized"))
                        colour = "#c0c0c0";
                    else if (details.contains("Professional"))
                        colour = "#ffd700";
                    e.appendChild(createIcon("bomb", "color: " + colour + "; background-color: white;"));
                    text = "Killstreak";
                }
                if (!text || e.hasAttribute("data-crate"))
                    text += "Unpriced";
            } else if (name.contains("Metal"))
                text = price[0] + " Refined";
            else if (name.contains("Key"))
                text = keyP.toFixed(2) + " Refined";
            else if (name.contains("Earbud"))
                text = budP.toFixed(2) + " Keys";
            else {
                var currency = e.getAttribute("data-price").split(" ")[1];
                if (currency.contains("Weapon"))
                    text += "Any Weapon";
                else if (currency.contains("Key") || currency.contains("Earbud"))
                    text += price[1].toFixed(2) + " " + currency;
                else
                    text += price[0] + " " + currency;
            }
            var txt = document.createElement("span");
            txt.className = "item-text";
            txt.style = "bottom: 0; left: 0; right: 0;";
            txt.appendChild(document.createTextNode(text));
            e.appendChild(txt);
        });
    }

    function calc(trade) {
        var total = 0,
            allPure = true;
        Array.prototype.forEach.call(trade, function(e) {
            var response = getPrice(e);
            total += response[0];
            allPure &= response[3];
        });
        total = Math.floor(round(total) * 100) / 100;
        var string = (total && !allPure ? "~" : "") + total + " Refined";
        if (total > +keyP.toFixed(2)) {
            string += "/ " + (total / keyP).toFixed(2) + " Keys";
            if (total > +(keyP * budP).toFixed(2))
                string += "/ " + (total / (keyP * budP)).toFixed(2) + " Buds";
        }
        return string;
    }

    function createIcon(cls, style) {
        var icon = document.createElement("i");
        icon.className = "fa fa-" + cls + " fa-inverse fa-border pull-left";
        icon.style = style;
        return icon;
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
            } else
                price = original = +data[0];
            if (name.match(/(?:Key|Earbud|(?:Slot|Class) Token)/))
                isPure = true;
            if (data[1].contains("Key"))
                price *= keyP;
            else if (data[1].contains("Earbud"))
                price *= keyP * budP;
            else if (name.match(/(?:Slot|Class) Token/))
                price = 1 / 6;
            if (!isPure)
                price = round(price);
        } else {
            ["Refined", "Reclaimed", "Scrap"].find(function(e, i) {
                if (name.contains(e) && name.contains("Metal")) {
                    price = 1 / Math.pow(3, i);
                    return isPure = true;
                }
            });
        }
        return [price, original, hasRange, isPure];
    }

    function round(num) {
        if (num <= 5 / 90)
            return num;
        return Math.floor(num) + Math.ceil(num % 1 * 9) / 9;
    }

    function summary(txt, parent) {
        var paints = {};
        txt.style.cursor = "pointer";
        Array.prototype.forEach.call(parent.querySelectorAll("[data-paint]"), function(e) {
            var name = e.getAttribute("data-notes").split("<\\\/p>")[0].slice(13);
            if (name != e.getAttribute("data-name"))
                paints[name] ? paints[name]++ : paints[name] = 1;
        });
        txt.addEventListener("click", function() {
            var msg = "",
                pnt = 0;
            for (var paint in paints) {
                msg += "[" + ("0" + paints[paint]).slice(-2) + "] " + paint + "\n";
                pnt += paints[paint];
            }
            msg += "Painted: " + pnt + "\n";
            msg += "Killstreaks: " + parent.getElementsByClassName("fa-bomb").length + "\n";
            msg += "Parted: " + parent.getElementsByClassName("fa-cogs").length + "\n";
            msg += "Uncraftable: " + parent.querySelectorAll("[data-flag_cannot_craft]").length + "\n";
            msg += "Untradable: " + parent.querySelectorAll("[data-flag_cannot_trade]").length + "\n";
            msg += "Gifted: " + parent.querySelectorAll(".fa-gift").length + "\n";
            msg += "Total Items: " + parent.children.length + "\n";
            alert(msg);
        });
    }

    function update() {
        if (document.getElementById("UserLoginForm"))
            return console.info("Bazaar.tf Script Paused (Signed Out). Version " + GM_info.script.version);
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register yours from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            update();
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.getItem("apikey"),
            onload: function(e) {
                var data = JSON.parse(e.response);
                if (!data.response.success) {
                    if (data.response.message === "API key does not exist.") {
                        alert("Invalid API key");
                        localStorage.removeItem("apikey");
                        update();
                    } else
                        return alert("Error: " + data.response.message);
                }
                var key = data.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0],
                    bud = data.response.items.Earbuds.prices[6].Tradable.Craftable[0],
                    k = (key.value + (key.value_high || key.value)) / 2,
                    b = (bud.value + (bud.value_high || bud.value)) / 2,
                    kDiff = " (" + (k === keyP ? "=" : (k < keyP ? "↓" : "↑")) + ")",
                    bDiff = " (" + (b === budP ? "=" : (b < budP ? "↓" : "↑")) + ")";
                localStorage.setItem("keyP", k);
                localStorage.setItem("budP", b);
                alert("Prices updated, Keys: " + k + " Refined" + kDiff + ", Earbuds: " + b + " Keys" + bDiff);
                localStorage.setItem("lastupdt", new Date());
                return location.reload();
            }
        });
    }

    try {
        /******** SCRIPT GLOBALS ********/
        var tradeView = document.querySelector(".fa-reply"),
            tradeList = document.querySelector(".fa-share"),
            keyP = +localStorage.getItem("keyP") || update(),
            budP = +localStorage.getItem("budP") || update(),
            lastUpdt = new Date() - Date.parse(localStorage.getItem("lastupdt"));
        /****** END SCRIPT GLOBALS ******/

        if (!lastUpdt || lastUpdt >= 864e5 * updateFreq)
            update();
        else {
            var diff = 864e5 * updateFreq - lastUpdt,
                days = Math.floor(diff / 864e5),
                hours = Math.floor((diff % 864e5) / 36e5),
                minutes = Math.floor((diff % 36e5) / 6e4);
            console.info("Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " min(s)");
        }

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
        } else if (tradeView) {
            if (document.querySelector(".fa-legal")) {
                var data = document.createElement("li"),
                    itms = document.querySelector(".offered-items").children,
                    text = document.createTextNode(calc(itms));
                annotate(itms);
                data.style = "color: orange;";
                data.appendChild(text);
                summary(data, document.querySelector(".offered-items"));
                document.querySelector(".trade-stats").appendChild(data);
                Array.prototype.forEach.call(document.querySelectorAll("[id^='thread-']"), function(e) {
                    var offer = e.querySelector(".comment-offers");
                    if (offer) {
                        var data = document.createElement("span"),
                            itms = offer.firstElementChild.children,
                            text = document.createTextNode(calc(itms)),
                            notes = offer.previousElementSibling.lastElementChild;
                        annotate(itms);
                        data.style = "color: orange; float: right;";
                        data.appendChild(text);
                        summary(data, offer.firstElementChild);
                        notes.insertBefore(data, notes.firstElementChild);
                    }
                    if (e.querySelector(".btn-warning.disabled"))
                        e.firstElementChild.style.borderColor = "orange";
                    else if (e.querySelector(".btn-success.disabled"))
                        e.firstElementChild.style.borderColor = "lime";
                });
            } else {
                annotate(document.querySelector(".offered-items").children);
                annotate(document.querySelector(".wanted-items").children);
                Array.prototype.forEach.call(document.getElementsByClassName("comment-offers"), function(e) {
                    annotate(e.firstElementChild.children);
                });
            }
        }
        console.info("Bazaar.tf Script Loaded. Version " + GM_info.script.version);
    } catch(e) {
        alert("[A fatal error has occured]\n" + e.message + "\n[Stack Trace]\n" + e.stack);
    }
})();