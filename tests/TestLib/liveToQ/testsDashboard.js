(function () {
    document.addEventListener("DOMContentLoaded", function () {
        var maxParallelRuns = 4;

        var runAll = document.querySelector("#btnRunAll");
        if (window.Windows) {
            runAll.style.display = "none";
            return;
        }

        function cleanUp() {
            var lis = document.querySelectorAll("li");
            for (var i = 0, l = lis.length; i < l; i++) {
                cleanUpLI(lis[i]);
            }
            socket && socket.close();
        }

        function cleanUpLI(li) {
            li.className = "";
            var cleanups = li.querySelectorAll(".cleanup");
            for (var j = 0, l2 = cleanups.length; j < l2; j++) {
                var e = cleanups[j];
                e.parentElement.removeChild(e);
            }
        }

        var socket = null;

        runAll.onclick = function () {
            runAll.disabled = true;
            function processQueue() {
                var toRun = queue.splice(0, Math.min(maxParallelRuns - numRunning, queue.length));
                toRun.forEach(function (linkDiv) {
                    linkDiv.querySelector(".status").textContent = "- Running...";
                    window.open(linkDiv.querySelector(".testLink").href + "&autostart=true&subscriptionKey=" + subscriptionKey, "", "width=800, height=500, top=0, left=400")
                    numRunning++;
                });
            }

            function addReproLink(li, testName, testNumber) {
                var testLink = li.querySelector(".testLink");

                var div = document.createElement("div");
                div.classList.add("cleanup");
                var aTag = document.createElement("a");
                aTag.textContent = "-" + testName;
                aTag.classList.add("reproLink");
                aTag.href = testLink.href + "&testNumber=" + testNumber;
                aTag.target = "_blank";
                div.appendChild(aTag);
                li.appendChild(div);
            }

            function addRerunLink(li) {
                var testLink = li.querySelector(".testLink");
                var status = li.querySelector(".status");

                var div = document.createElement("div");
                div.classList.add("cleanup");
                var aTag = document.createElement("a");
                aTag.textContent = "Click to rerun";
                aTag.classList.add("reproLink");
                aTag.href = "";
                div.appendChild(aTag);
                li.insertBefore(div, li.firstElementChild.nextElementSibling);
                aTag.addEventListener("click", function (e) {
                    e.preventDefault();
                    cleanUpLI(li);

                    status.textContent = "- Queued to rerun...";
                    queue.push(testLink.parentElement);
                    processQueue();
                });
            }

            cleanUp();

            var subscriptionKey = Date.now();
            var queue = [];
            var numRunning = 0;

            socket = new WebSocket("ws://localhost:9998");
            socket.onopen = function () {
                socket.send(JSON.stringify({ id: "Dashboard", type: "registerSubscriber", args: { subscriptionKey: subscriptionKey } }));

                var linkDivs = document.querySelectorAll(".testLinkDiv");
                for (var i = 0, l = linkDivs.length; i < l; i++) {
                    var linkDiv = linkDivs[i];
                    linkDiv.querySelector(".status").textContent = "- Queued to run";
                    queue.push(linkDiv);
                }
                processQueue();
            };
            socket.onmessage = function (m) {
                var message = JSON.parse(m.data);

                switch (message.type) {
                    case "osinfo":
                        // length - 1 or the dashboard will hang and not update in real time
                        //maxParallelRuns = Math.max(2, message.args.cpu.length - 1);
                        processQueue();
                        break;

                    case "report":
                        var li = document.querySelector("#id_" + message.id);
                        var data = message.args.data;
                        switch (data.type) {
                            case "singleFailure":
                                li.classList.add("failed");
                                addReproLink(li, data.name, data.number);
                                break;
                            case "finished":
                                li.classList.add("reported");
                                li.querySelector(".status").textContent = "- " + (((+data.runtime / 1000) + 1) | 0) + "s";
                                if (data.failures) {
                                    addRerunLink(li);
                                } else {
                                    li.classList.add("passed");
                                }
                                break;
                        }
                        break;

                    case "reporterDisconnected":
                        var li = document.querySelector("#id_" + message.id);
                        if (!li.classList.contains("reported")) {
                            li.classList.add("reported");
                            li.classList.add("failed");
                            var status = li.querySelector(".status");
                            status.textContent = "- Canceled";
                            addRerunLink(li);
                        }
                        numRunning--;
                        processQueue();
                        break;
                }
            };
        };

        if (document.location.search.indexOf("autostart=true") >= 0) {
            runAll.click();
        }
    });
})();