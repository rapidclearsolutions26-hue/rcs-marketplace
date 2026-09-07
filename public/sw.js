self.addEventListener("push", function (event) {
  console.log("RCS: Push event received.");

  let data = {};

  try {
    if (event.data) {
      try {
        data = event.data.json();

        console.log(
          "RCS: Push JSON received:",
          data
        );
      } catch (jsonError) {
        const text = event.data.text();

        console.log(
          "RCS: Plain text push received:",
          text
        );

        data = {
          title: "RCS Waste",
          message: text,
          url: "/driver/dashboard",
          tag: "rcs-devtools-test",
          requireInteraction: true,
        };
      }
    }
  } catch (error) {
    console.error(
      "RCS: Push notification data error:",
      error
    );

    data = {
      title: "RCS Waste",
      message:
        "You have a new RCS update.",
      url: "/driver/dashboard",
    };
  }

  /*
   * =========================================================
   * NOTIFICATION DATA
   * =========================================================
   */

  const title =
    data.title ||
    "RCS Waste";

  const message =
    data.message ||
    data.body ||
    "You have a new RCS update.";

  const url =
    data.url ||
    "/driver/dashboard";

  const tag =
    data.tag ||
    "rcs-notification";

  const icon =
    data.icon ||
    "/icon-192.png";

  const badge =
    data.badge ||
    "/icon-192.png";

  /*
   * =========================================================
   * OPTIONAL NOTIFICATION SETTINGS
   * =========================================================
   */

  const requireInteraction =
    data.requireInteraction ??
    true;

  const silent =
    data.silent ??
    false;

  /*
   * =========================================================
   * EXTRA DATA
   *
   * This allows us to pass things such as:
   *
   * notificationType
   * jobId
   * bidId
   * role
   *
   * We can use these later when the
   * notification is clicked.
   * =========================================================
   */

  const notificationData = {
    url,

    notificationType:
      data.notificationType ||
      null,

    jobId:
      data.jobId ||
      null,

    bidId:
      data.bidId ||
      null,

    role:
      data.role ||
      null,

    reference:
      data.reference ||
      null,
  };

  /*
   * =========================================================
   * NOTIFICATION OPTIONS
   * =========================================================
   */

  const options = {
    body: message,

    icon,

    badge,

    tag,

    requireInteraction,

    silent,

    data: notificationData,

    /*
     * Notification actions can be added later.
     *
     * Example:
     *
     * actions: [
     *   {
     *     action: "view",
     *     title: "View job"
     *   }
     * ]
     */
  };

  console.log(
    "RCS: Showing notification:",
    title,
    options
  );

  /*
   * =========================================================
   * SHOW NOTIFICATION
   * =========================================================
   */

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

/*
 * ===========================================================
 * NOTIFICATION CLICK
 * ===========================================================
 */

self.addEventListener(
  "notificationclick",
  function (event) {
    console.log(
      "RCS: Notification clicked."
    );

    event.notification.close();

    /*
     * =======================================================
     * GET URL
     * =======================================================
     */

    const url =
      event.notification.data?.url ||
      "/driver/dashboard";

    console.log(
      "RCS: Opening notification URL:",
      url
    );

    /*
     * =======================================================
     * OPEN / FOCUS EXISTING RCS WINDOW
     * =======================================================
     */

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(function (clientList) {
          /*
           * Look for an existing RCS tab/window.
           */

          for (
            const client of clientList
          ) {
            if (
              "focus" in client
            ) {
              client.navigate(url);

              return client.focus();
            }
          }

          /*
           * No RCS window is open.
           *
           * Open a new one.
           */

          if (
            clients.openWindow
          ) {
            return clients.openWindow(
              url
            );
          }

          return undefined;
        })
    );
  }
);

/*
 * ===========================================================
 * SERVICE WORKER INSTALL
 * ===========================================================
 */

self.addEventListener(
  "install",
  function () {
    console.log(
      "RCS: Service worker installed."
    );

    self.skipWaiting();
  }
);

/*
 * ===========================================================
 * SERVICE WORKER ACTIVATE
 * ===========================================================
 */

self.addEventListener(
  "activate",
  function (event) {
    console.log(
      "RCS: Service worker activated."
    );

    event.waitUntil(
      self.clients.claim()
    );
  }
);