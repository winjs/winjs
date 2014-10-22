
## Symbols.ttf

### Which symbols are included?

![image](https://cloud.githubusercontent.com/assets/1873511/4743617/a1ca0458-5a29-11e4-87a6-04c173b3e19a.png)
![image](https://cloud.githubusercontent.com/assets/1873511/4743753/9ee5e1ca-5a2a-11e4-89e8-8aca67823755.png)
![image](https://cloud.githubusercontent.com/assets/1873511/4743636/c7c05630-5a29-11e4-871b-8e11a2459cc1.png)
![image](https://cloud.githubusercontent.com/assets/1873511/4743645/d457173a-5a29-11e4-84a8-705ff6b7167a.png)
![image](https://cloud.githubusercontent.com/assets/1873511/4743653/e42df700-5a29-11e4-88e9-c9c86ab0917f.png)
![image](https://cloud.githubusercontent.com/assets/1873511/4743665/f108b276-5a29-11e4-9938-6292135862c0.png)

### How to reference them?

There are many ways to reference icons from Symbols.ttf. 

If you are using them for icons in `WinJS.UI.AppBarCommand`, `WinJS.UI.NavBarCommand`, or `WinJS.UI.Command`, you can simply specify the string next to each icon above as the value of the 'icon' property. For example:

```html
    <div data-win-control="WinJS.UI.AppBar" data-win-options="{sticky: true, placement: 'top'}">
        <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{id:'cmdAdd',label:'Add',icon:'add',section:'primary',tooltip:'Add item'}"></button>
        <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{id:'cmdRemove',label:'Remove',icon:'remove',section:'primary',tooltip:'Remove item'}"></button>
        <hr data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type:'separator',section:'primary'}" />
        <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{id:'cmdCamera',label:'Camera',icon:'camera',section:'primary',tooltip:'Camera'}"></button>
        <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{id:'cmdToggle',label:'Toggle',icon:'mappin',section:'primary', type:'toggle', tooltip:'Toggle'}"></button>
        <hr data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type:'separator',section:'primary'}" />
    </div>
```

Notice, how these commands are configured to use the following icons: 'add', 'remove', 'camera', 'mappin', resulting in:

![image](https://cloud.githubusercontent.com/assets/1873511/4744323/3facd100-5a2f-11e4-93c4-068fcb43370d.png)

or refer to: https://github.com/winjs/winjs/blob/master/src/js/WinJS/Controls/AppBar/_Icon.js for the full list of icon strings.


If you are using the icons, in your own custom controls, here is a simple sample usage:

```html
<div class="myIcon"></div>
```

```css
.myIcon::before {
    content: "\E082";
}
.myIcon {
    font-family: "Symbols";
    font-size: 28px;
    color: #5729c1;
}
```

The css above requires that "Symbols" is declared, e.g.

```css
@font-face {
  font-family: "Symbols";
  src: url(../fonts/Symbols.ttf);
}
```

`winjs\css\ui-light.css` and `winjs\css\ui-dark.css` already include this declaration.

output:

![image](https://cloud.githubusercontent.com/assets/1873511/4744006/a1358762-5a2c-11e4-87d9-78ed3de63b0f.png)

### Learn more
Refer to: http://blogs.windows.com/buildingapps/2014/09/17/winjs-everywhere/
