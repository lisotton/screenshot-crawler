var casper = require('casper').create({
  /* verbose: true, logLevel: "debug" */
});

var release = casper.cli.get("release"),
    screenshotsFolder = casper.cli.get("screenshots-folder"),
    startUrl = casper.cli.get("url");

// URL variables
var visitedUrls = [], pendingUrls = [];

var utils = require('utils')
var helpers = require('./helpers')


// Spider from the given URL
function spider(url) {

  // Add the URL to the visited stack
  visitedUrls.push(url);

  // Open the URL
  casper.open(url).viewport(1024, 768).then(function() {
    var baseUrl = this.getGlobal('location').origin;

    // Set the status style based on server status code
    var status = this.status().currentHTTPStatus;
    switch(status) {
      case 200: var statusStyle = { fg: 'green', bold: true }; break;
      case 404: var statusStyle = { fg: 'red', bold: true }; break;
       default: var statusStyle = { fg: 'magenta', bold: true }; break;
    }

    // Display the spidered URL and status
    if (status == 200) {
      this.wait(2000, function() {
        var pathname = this.getGlobal('location').pathname;
        
        this.echo(this.colorizer.format(status, statusStyle) + ' ' + url + ' --- Taking screenshot!!');
        this.capture(screenshotsFolder + encodeURIComponent(pathname) + '_' + release + '.png');
      });
    }
    else {
      this.echo(this.colorizer.format(status, statusStyle) + ' ' + url);
    }

    // Find links present on this page
    var links = this.evaluate(function() {
      var links = [];
      Array.prototype.forEach.call(__utils__.findAll('a'), function(e) {
        links.push(e.getAttribute('href'));
      });
      return links;
    });

    // Add newly found URLs to the stack
    Array.prototype.forEach.call(links, function(link) {
      var newUrl = helpers.absoluteUri(baseUrl, link);
      if (pendingUrls.indexOf(newUrl) == -1 && visitedUrls.indexOf(newUrl) == -1 && newUrl.indexOf(baseUrl) === 0) {
        //casper.echo(casper.colorizer.format('-> Pushed ' + newUrl + ' onto the stack', { fg: 'magenta' }));
        pendingUrls.push(newUrl);
      }
    });

    // If there are URLs to be processed
    if (pendingUrls.length > 0) {
      var nextUrl = pendingUrls.shift();
      //this.echo(this.colorizer.format('<- Popped ' + nextUrl + ' from the stack', { fg: 'blue' }));
      spider(nextUrl);
    }

  });

}

// Start spidering
casper.start(startUrl, function() {
  spider(startUrl);
});


casper.run();