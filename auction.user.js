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
// @version             1.3.5
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var updateFreq = 3,              //(days) currency price refresh frequency
        highlightRetracted = 1;      //(boolean) highlight retracted offers
    /******** END OF SETTINGS *******/

    function round(num) {
        var val;
        if (num <= 5 / 90)
            val = Math.round(num * 90) / 90;
        else
            val = Math.floor(num) + (Math.round(num % 1 * 9)) / 9;
        if (val.toFixed(2) % 1 >= 5 / 90)
            val -= 0.005;
        return val.toFixed(2);
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
                    alert("API Error: Received nothing");
                else if (data.response.message)
                    alert(data.response.message);
                var key = data.response.items["Mann Co. Supply Crate Key"]["prices"][6]["Tradable"]["Craftable"][0],
                    bud = data.response.items["Earbuds"]["prices"][6]["Tradable"]["Craftable"][0],
                    k = key.value_high ? ((key.value + key.value_high) / 2) : key.value,
                    b = bud.value_high ? ((bud.value + bud.value_high) / 2) : bud.value;
                    localStorage.setItem("keyP", k);
                    localStorage.setItem("budP", b);
                    alert("Updated, Key: " + k + ", Bud: " + b);
                    localStorage.setItem("lastupdt", new Date());
            }
        });
    }

    function sum(arr) {
        var total = 0,
            unpriced = 0,
            parted = 0;
        for (var a = 0; a < arr.length; a++) {
            var price;
            if (arr[a].hasAttribute("data-price")) {
                price = arr[a].getAttribute("data-price").split(" ")[0];
                if (price === "Any")
                    price = 1 / 18;
                else if (price.contains("-"))
                    price = (parseFloat(price.split("-")[0]) + parseFloat(price.split("-")[1])) / 2;
                if (arr[a].getAttribute("data-price").split(" ")[1].contains("Key"))
                    price *= keyP;
                else if (arr[a].getAttribute("data-price").split(" ")[1].contains("Earbud"))
                    price *= keyP * budP;
                if (arr[a].className.contains("q11") && arr[a].getAttribute("data-notes").match(/<p>/g).length > 1) {
                    arr[a].style.borderStyle = "double";
                    parted++;
                }
            }
            else {
                switch (arr[a].getAttribute("data-name")) {
                    case "Refined Metal":
                        price = 1;
                        break;
                    case "Reclaimed Metal":
                        price = 1 / 3;
                        break;
                    case "Scrap Metal":
                        price = 1 / 9;
                        break;
                    case "Mann Co. Supply Crate":
                        price = 1 / 90;
                        break;
                    default:
                        arr[a].style.borderColor = "grey";
                        arr[a].style.borderStyle = "double";
                        unpriced++;
                        price = 0;
                }
            }
            total += +price;
        }
        total = round(total);
        var string = total + " Refined";
        if (total > keyP)
            string += "/ " + (total / keyP).toFixed(2) + " Keys";
        if (total > keyP * budP)
            string += "/ " + (total / (keyP * budP)).toFixed(2) + " Buds";
        string += " (" + arr.length + " item" + (arr.length === 1 ? "" : "s") + ": " +
        unpriced + " unpriced, " + parted + " parted)";
        return string;
    }

    if (!localStorage.getItem("keyP") || !localStorage.getItem("budP"))
        update();
    else if (!localStorage.getItem("lastupdt") || (new Date() - localStorage.getItem("lastupdt") >= 86400 * updateFreq))
        update();

    if (document.getElementsByClassName("fa-legal").length && document.getElementsByClassName("fa-reply").length) {
        var keyP = +localStorage.getItem("keyP"),
            budP = +localStorage.getItem("budP"),
            data = document.createElement("li"),
            text = document.createTextNode(sum(document.getElementsByClassName("offered-items")[0].children));
        data.setAttribute("style", "color: orange;");
        data.appendChild(text);
        document.getElementsByClassName("trade-stats")[0].appendChild(data);

        var offers = document.getElementsByClassName("comment-offers");
        for (a = 0; a < offers.length; a++) {
            data = document.createElement("span");
            text = document.createTextNode(sum(offers[a].firstElementChild.children));
            data.setAttribute("style", "color: orange; float: right;");
            data.appendChild(text);
            var notes = offers[a].previousElementSibling.lastElementChild;
            notes.insertBefore(data, notes.firstElementChild);
        }

        if (highlightRetracted) {
            var retracted = document.getElementsByClassName("btn-warning disabled");
            for (a = 0; a < retracted.length; a++)
                retracted[a].parentNode.parentNode.parentNode.parentNode.style.borderColor = "orange";
        }
    }
    console.info("Script Loaded.");
}).call(this);