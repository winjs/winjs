// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/util.js" />
/// <reference path="stylesCollection.js"/>
/// <reference path="stylesTestHelper.js"/>
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.js"/>

var CorsicaTests = CorsicaTests || {};

CorsicaTests.StylesUIDark = function () {
    var link = null;

    var isDarkTest = true;
    var testHelper = new StylesTestHelper(isDarkTest);		

    this.setUp = function (complete) {
        Helper.disableStyleSheets("ui-light.css");
        var newNode = document.createElement("div");
        newNode.id = "host";
        newNode.style.width = "500px";
        document.body.appendChild(newNode);
        this._element = newNode;

        CommonUtilities.addCss("ui-dark.css").then(function (style) {
            link = style;
            complete();
        });
    };
    
    this.tearDown = function () {
        document.head.removeChild(link);
        Helper.enableStyleSheets("ui-light.css");
        if (this._element) {
            WinJS.Utilities.disposeSubTree(this._element);
            document.body.removeChild(this._element);
            this._element = null;
        }
    };
	 
	this.testH1 = testHelper.testH1;
	
	this.testH2 = testHelper.testH2;
	 
	this.testH3 = testHelper.testH3;
	 
	this.testH4 = testHelper.testH4;
	 
	this.testH5 = testHelper.testH5;
	 
	this.testH6 = testHelper.testH6;
	
	this.testEditText = testHelper.testEditText;
	
	this.testButton = testHelper.testButton;
	
	this.testSystemLink = testHelper.testSystemLink;
	
	this.testPickerBox = testHelper.testPickerBox;
	
	this.testSlider = testHelper.testSlider;
	
	this.testProgressBar = testHelper.testProgressBar;
   
};   
   
LiveUnit.registerTestClass("CorsicaTests.StylesUIDark");