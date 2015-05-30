if (typeof(MakerMap) == 'undefined')
    MakerMap = {};
    
if (typeof(MakerMap.Model) == 'undefined')
    MakerMap.Model = {};

if (typeof(MakerMap.Model.Maker) == 'undefined') {
    MakerMap.Model.Maker = Parse.Object.extend("Maker", {
        
    });
    MakerMap.Model.PrimaryClassification = Parse.Object.extend("PrimaryClassification", {
        
    });
}