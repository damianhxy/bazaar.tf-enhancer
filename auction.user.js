// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Calculates value of trade items
// @downloadURL         https://github.com/damianhxy/Auction-Helper/raw/master/auction.user.js
// @grant               GM_xmlhttpRequest
// @include             /^https?:\/\/bazaar\.tf.*/
// @name                Bazaar Trade Value
// @namespace           localhost
// @run-at              document-end
// @updateURL           https://github.com/damianhxy/Auction-Helper/raw/master/auction.meta.js
// @version             1.3.8
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var updateFreq = 3;              //(days) currency price refresh frequency
    /******** END OF SETTINGS *******/

    function round(num) {
        var val;
        if (num <= 5 / 90)
            val = Math.round(num * 90) / 90;
        else
            val = Math.floor(num) + (Math.round(num % 1 * 9)) / 9;
        if (val.toFixed(2) % 1 >= 5 / 90)
            val -= 0.005;
        return val;
    }

    function update() {
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API Key not set, please enter below:"));
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
                    b = bud.value_high ? ((bud.value + bud.value_high) / 2) : bud.value;
                    kOld = +localStorage.getItem("keyP");
                    bOld = +localStorage.getItem("budP");
                    kChange = " (" + (k === kOld ? "=" : (k < kOld ? "↓" : "↑")) + ")";
                    bChange = " (" + (b === bOld ? "=" : (b < bOld ? "↓" : "↑")) + ")";
                    localStorage.setItem("keyP", k);
                    localStorage.setItem("budP", b);
                    alert("Updated Prices, Key: " + k + " refined" + kChange + ", Bud: " + b + " keys" + bChange);
                    localStorage.setItem("lastupdt", new Date());
            }
        });
    }

    function getPrice(ele) {
        var price;
        if (ele.hasAttribute("data-price")) {
            var data = ele.getAttribute("data-price").split(" ");
            if (data[0] === "Any")
                price = 1 / 18;
            else if (data[0].contains("-")) {
                var pts = data[0].split("-");
                price = (pts[0] + pts[1]) / 2;
            }
            else
                price = +data[0];
            if (data[1].contains("Key"))
                price *= keyP;
            else if (data[1].contains("Earbud"))
                price *= keyP * budP;
            else
                price = round(price);
        }
        else {
            switch (ele.getAttribute("data-name")) {
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
                    if (ele.getAttribute("data-name").contains("Mann Co."))
                        price = 1 / 90;
            }
        }
        return price;
    }

    function annotate(trade) {
        var text,
            price;
        for (var a = 0; a < trade.length; a++) {
            if (trade[a].getAttribute("data-type") === "more-items-icon")
                continue;
            var children = trade[a].children;
            for (var b = 0; b < children.length; b++) {
                if (children[b].className === "ks") {
                    children[b].style.display = "none";
                    trade[a].innerHTML += "<i class='fa fa-bomb fa-inverse fa-border pull-left'></i>";
                }
            }
            if (trade[a].hasAttribute("data-notes") && trade[a].getAttribute("data-notes").contains("Painted:"))
                trade[a].innerHTML += "<i class='fa fa-paint-brush fa-inverse fa-border pull-left'></i>";
            if (trade[a].className.contains("q11")) {
                var count = trade[a].getAttribute("data-notes").match(/<p>/g).length;
                if (trade[a].getAttribute("data-notes").contains("Painted: "))
                    count--;
                if (count > 1)
                    trade[a].innerHTML += "<i class='fa fa-cogs fa-inverse fa-border pull-left'></i>";
            }
            price = getPrice(trade[a]);
            if (price === 0) {
                if (trade[a].hasAttribute("data-special") && trade[a].getAttribute("data-special") === "Low craft #")
                    trade[a].innerHTML += "<i class='fa fa-exclamation-triangle fa-inverse fa-border pull-left'>";
                else
                    trade[a].innerHTML += "<i class='fa fa-question-circle fa-inverse fa-border pull-left'></i>";
                text = "Unpriced";
            }
            else if (trade[a].getAttribute("data-name").contains("Metal"))
                text = price.toFixed(2) + " Refined";
            else
                text = trade[a].getAttribute("data-price");
            var txt = document.createElement("span");
            txt.setAttribute("class", "item-text");
            txt.setAttribute("style", "bottom: 0; left: 0; right: 0;");
            txt.innerHTML = text;
            trade[a].appendChild(txt);
        }
    }

    function calc(trade) {
        var total = 0,
            painted = 0,
            parted = 0,
            unpriced = 0;
        for (var a = 0; a < trade.length; a++) {
            var price = getPrice(trade[a]);
            if (trade[a].className.contains("q11")) {
                var count = trade[a].getAttribute("data-notes").match(/<p>/g).length;
                if (trade[a].getAttribute("data-notes").contains("Painted: "))
                    count--;
                if (count > 1)
                    parted++;
            }
            if (trade[a].hasAttribute("data-notes") && trade[a].getAttribute("data-notes").contains("Painted:"))
                painted++;
            if (!price)
                unpriced++;
            total += price;
        }
        total = round(total).toFixed(2);
        var string = total + " Refined";
        if (total > keyP)
            string += "/ " + (total / keyP).toFixed(2) + " Keys";
        if (total > keyP * budP)
            string += "/ " + (total / (keyP * budP)).toFixed(2) + " Buds";
        string += " in " + trade.length + " item" + (trade.length === 1 ? "" : "s");
        string += " (" + painted + " Painted, " + parted + " Parted & " + unpriced + " Unpriced Items)";
        return string;
    }

    if (!localStorage.getItem("keyP") || !localStorage.getItem("budP"))
        update();
    else if (!localStorage.getItem("lastupdt") || (new Date() - Date.parse(localStorage.getItem("lastupdt")) >= 86400e3 * updateFreq))
        update();

    var keyP = +localStorage.getItem("keyP"),
        budP = +localStorage.getItem("budP"),
        cNo = document.getElementsByClassName("item-number");
    for (var a = 0; a < cNo.length; a++)
        cNo[a].style.display = "none";

    if (!(document.getElementsByClassName("fa-legal").length && document.getElementsByClassName("fa-reply").length)) {
        var trades = document.querySelectorAll("div[id^='trade-']");
        for (var a = 0; a < trades.length; a++) {
            var items = trades[a].children[1].firstElementChild.children;
            annotate(items);
        }
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

        var retracted = document.getElementsByClassName("btn-warning disabled");
        for (var a = 0; a < retracted.length; a++)
            retracted[a].parentNode.parentNode.parentNode.parentNode.style.borderColor = "orange";
    }
    console.info("Bazaar.tf Script Loaded. Version " + GM_info.script.version);
}).call(this);