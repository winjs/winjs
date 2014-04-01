function argbToHex(color)
{
    var hex = color.substring("argb(".length, color.indexOf(")"));
    hex = hex.split(",");
    for (var i = 1; i < 4; ++i)
    {
        hex[i] = parseInt(hex[i], 10).toString(16);
    }
    hex[0] = parseInt(hex[0] * 255, 10).toString(16);
    for (var i = 0; i < hex.length; ++i)
    {
        if (hex[i].length === 1)
            hex[i] += "0";
    }
    hex = "#" + hex[0] + hex[1] + hex[2] + hex[3];

    return hex;
}

function rgbToHex(color)
{
    var hex = color.substring("rgb(".length, color.indexOf(")"));
    hex = hex.split(",");
    for (var i = 0; i < 3; ++i)
    {
        hex[i] = parseInt(hex[i], 10).toString(16);
        if (hex[i].length === 1)
            hex[i] += "0";
    }
    hex = "#ff" + hex[0] + hex[1] + hex[2];

    return hex;
}

function rgbaToHex(color)
{
    var hex = color.substring("rgba(".length, color.indexOf(")"));
    hex = hex.split(",");
    for (var i = 0; i < 3; ++i)
    {
        hex[i] = parseInt(hex[i], 10).toString(16);
    }
    hex[3] = parseInt(hex[3] * 255, 10).toString(16);
    for (var i = 0; i < hex.length; ++i)
    {
        if (hex[i].length === 1)
            hex[i] += "0";
    }
    hex = "#" + hex[3] + hex[0] + hex[1] + hex[2];

    return hex;
}

function hexToHex(color)
{
    var hex = color.substr(1);
    if (hex.length === 3)
    {
        var newHex = "";
        for (var i = 0; i < hex.length; ++i)
            newHex += hex[i] + "0";
        hex = newHex;
    }
    else if (hex.length === 6)
    {
        hex = "ff" + hex;
    }

    return "#" + hex;
}

function convertToHex(color)
{
    if (color.indexOf("rgba") === 0)
        return rgbaToHex(color);
    else if (color.indexOf("rgb") === 0)
        return rgbToHex(color);
    else if (color.indexOf("#") === 0)
        return hexToHex(color);

    return null;
}

function compare(a, b)
{
    var hexA = convertToHex(a.replace(/\s+/g, ''));
    var hexB = convertToHex(b.replace(/\s+/g, ''));
    if (!hexA || !hexB)
        return a === b;

    return hexA === hexB;
}

module.exports = compare;