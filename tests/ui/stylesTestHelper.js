// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
function StylesTestHelper(isDark) {

  var subjectiveSizing = .1; //This is because some widths / heights are not exact numbers. 
								 //This allows the test to pass, but does not represent a threat to test / feature stability
	
  var isDarkTest = isDark;
	
  function verifyElementProperties (element, refElement) {
  
		var isPhone = WinJS.Utilities.isPhone;
		var testStatus;
		var success = "SUCCESS: ";
		var failure = "FAILURE: "

		var expectedWidth;
		if (isPhone) {
			expectedWidth = refElement.width_phone;
		} else {
			expectedWidth = refElement.width;
		}
		var isWidth = (element.width === expectedWidth);
		if (isWidth) {
			testStatus = success;
		} else {
			var widthUpperBound = expectedWidth + subjectiveSizing;
			var widthLowerBound = expectedWidth - subjectiveSizing;
			if (element.width > widthUpperBound || element.width < widthLowerBound) {
				testStatus = failure;
			} else {
				testStatus = success;
				isWidth = true;
			}
		}
		LiveUnit.LoggingCore.logComment(testStatus + "expected width: " + expectedWidth + 
			", actual width: " + element.width);
		
		var expectedHeight;
		if (isPhone) {
			expectedHeight = refElement.height_phone;
		} else {
			expectedHeight = refElement.height;
		}
		var isHeight = (element.height === expectedHeight);
		if (isHeight) {
			testStatus = success;
		} else {
			var heightUpperBound = expectedHeight + subjectiveSizing;
			var heightLowerBound = expectedHeight - subjectiveSizing;
			if (element.height > heightUpperBound || element.height < heightLowerBound) {
				testStatus = failure;
			} else {
				testStatus = success;
				isHeight = true;
			}
		}
		LiveUnit.LoggingCore.logComment(testStatus + "expected height: " + expectedHeight + 
			", actual height: " + element.height);
		
		var expectedColor;
		if (isPhone) {
			if (isDarkTest) {
				expectedColor = refElement.colordark_phone;
			} else {
				expectedColor = refElement.colorlight_phone;
			}
		} else {
			if (isDarkTest) {
				expectedColor = refElement.colordark;
			} else {
				expectedColor = refElement.colorlight;
			}
		}
		var isColor = (element.color === expectedColor);
		if (isColor) {
			testStatus = success;
		} else {
			testStatus = failure;
		}
		LiveUnit.LoggingCore.logComment(testStatus + "expected color: " + expectedColor + 
			", actual color: " + element.color);
		return (isWidth && isHeight && isColor);
  }
	 
	this.testH1 = function () {
		var host = document.getElementById("host");
        var h1 = document.createElement("h1");
        host.appendChild(h1);
		
		h1.innerHTML = "h1";
		
		var element = h1.getBoundingClientRect();
		element.color = getComputedStyle(h1).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.h1));
		
		host.removeChild(h1);
	};
	
	this.testH2 = function () {
		var host = document.getElementById("host");
        var h2 = document.createElement("h2");
        host.appendChild(h2);
		
		h2.innerHTML = "h2";
		
		var element = h2.getBoundingClientRect();
		element.color = getComputedStyle(h2).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.h2));
		
		host.removeChild(h2);
	};
	 
	this.testH3 = function () {
		var host = document.getElementById("host");
        var h3 = document.createElement("h3");
        host.appendChild(h3);
		
		h3.innerHTML = "h3";
		
		var element = h3.getBoundingClientRect();
		element.color = getComputedStyle(h3).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.h3));
		
		host.removeChild(h3);
	};
	 
	this.testH4 = function () {
		var host = document.getElementById("host");
        var h4 = document.createElement("h4");
        host.appendChild(h4);
		
		h4.innerHTML = "h4";
		
		var element = h4.getBoundingClientRect();
		element.color = getComputedStyle(h4).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.h4));
		
		host.removeChild(h4);
	};
	 
	this.testH5 = function () {
		var host = document.getElementById("host");
        var h5 = document.createElement("h5");
        host.appendChild(h5);
		
		h5.innerHTML = "h5";
		
		var element = h5.getBoundingClientRect();
		element.color = getComputedStyle(h5).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.h5));
		
		host.removeChild(h5);
	};
	 
	this.testH6 = function () {
		var host = document.getElementById("host");
        var h6 = document.createElement("h6");
        host.appendChild(h6);
		
		h6.innerHTML = "h6";
		
		var element = h6.getBoundingClientRect();
		element.color = getComputedStyle(h6).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.h6));
		
		host.removeChild(h6);
	};
	
	this.testEditText = function () {
		var host = document.getElementById("host");
        var edittext = document.createElement("input");
		edittext.type = "text";
        host.appendChild(edittext);
		
		var element = edittext.getBoundingClientRect();
		element.color = getComputedStyle(edittext).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.edittext));
		
		host.removeChild(edittext);
	};
	
	this.testButton = function () {
		var host = document.getElementById("host");
        var button = document.createElement("button");
        host.appendChild(button);
		
		var element = button.getBoundingClientRect();
		element.color = getComputedStyle(button).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.button));
		
		host.removeChild(button);
	};
	
	this.testRadioButton = function () {
		var host = document.getElementById("host");
		var radio = document.createElement("input");
        radio.type = "radio";
        host.appendChild(radio);
		
		var element = radio.getBoundingClientRect();
		element.color = getComputedStyle(radio).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.radiobutton));
		
		radio.checked = "checked";
		
		element = radio.getBoundingClientRect();
		element.color = getComputedStyle(radio).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.radiobutton));
		
		host.removeChild(radio);
	};
	
	this.testSystemLink = function () {
		var host = document.getElementById("host");
        var a = document.createElement("a");

        a.innerHTML = "link";
        host.appendChild(a);
		
		var element = a.getBoundingClientRect();
		element.color = getComputedStyle(a).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.systemlink));
		
		host.removeChild(a);
	};
	
	this.testPickerBox = function () {
		var host = document.getElementById("host");
		var pickerbox = document.createElement("select");
        host.appendChild(pickerbox);
		
		var element = pickerbox.getBoundingClientRect();
		element.color = getComputedStyle(pickerbox).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.pickerbox));
		
		host.removeChild(pickerbox);
	};
	
	this.testCheckBox = function () {
		var host = document.getElementById("host");
		var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        host.appendChild(checkbox);
		
		var element = checkbox.getBoundingClientRect();
		element.color = getComputedStyle(checkbox).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.checkbox));
		
		checkbox.checked = "checked";
		
		element = checkbox.getBoundingClientRect();
		element.color = getComputedStyle(checkbox).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.checkbox));
		
		host.removeChild(checkbox);
	};
	
	this.testSlider = function () {
		var host = document.getElementById("host");
        var slider = document.createElement("input");
        slider.type = "range";
        host.appendChild(slider);
		
		var element = slider.getBoundingClientRect();
		element.color = getComputedStyle(slider).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.slider));
		
		host.removeChild(slider);
	};
	
	this.testProgressBar = function () {
		var host = document.getElementById("host");
        var progressbar = document.createElement("progress");
        host.appendChild(progressbar);
		
		var element = progressbar.getBoundingClientRect();
		element.color = getComputedStyle(progressbar).color;
		LiveUnit.Assert.isTrue(verifyElementProperties(element, reference.progressbar));
		
		host.removeChild(progressbar);
	};
  
  
}; 
   