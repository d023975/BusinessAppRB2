using BusinessAppRB2Service as service from '../../srv/service';

annotate service.Capex with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Description',
            Value : description,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Total Cost',
            Value : total_cost,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Contractor',
            Value : contractors_contractor,
        },
    ]
);
annotate service.Capex with @(
    UI.FieldGroup #GeneratedGroup1 : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Description',
                Value : description,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Total Cost',
                Value : total_cost,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup1',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Contractors',
            ID : 'Contractors',
            Target : '@UI.FieldGroup#Contractors',
        },
    ]
);
annotate service.Capex with {
    contractors @Common.Text : {
            $value : contractors.name,
            ![@UI.TextArrangement] : #TextOnly,
        }
};
annotate service.Capex with @(
    UI.FieldGroup #Contractors : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Contractor',
                Value : contractors_contractor,
            },],
    }
);
annotate service.Capex with @(
    UI.HeaderInfo : {
        Title : {
            $Type : 'UI.DataField',
            Value : description,
        },
        TypeName : '',
        TypeNamePlural : '',
    }
);
