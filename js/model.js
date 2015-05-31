if (typeof(MakerMap) == 'undefined')
    MakerMap = {};
    
if (typeof(MakerMap.Model) == 'undefined')
    MakerMap.Model = {};

if (typeof(MakerMap.Model.Maker) == 'undefined') {
    /**
     * A maker denotes a maker space with a geographical location
     */
    MakerMap.Model.Maker = Parse.Object.extend("Maker", {
        
    });
    /**
     * An asset denotes a maker resource with a geographical location
     */
    MakerMap.Model.Asset = Parse.Object.extend("Asset", {
        
    });
    /**
     * A lookup value denoting the primary classification of a maker
     */
    MakerMap.Model.PrimaryClassification = Parse.Object.extend("PrimaryClassification", {
        
    });
    /**
     * A lookup value denoting the material type of an asset
     */
    MakerMap.Model.MaterialType = Parse.Object.extend("MaterialType", {
        
    });
    /**
     * A lookup value denoting the business type of a maker
     */
    MakerMap.Model.BusinessType = Parse.Object.extend("BusinessType", {
        
    });
}