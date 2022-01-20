namespace BusinessAppRB2;

using sap.workflow from './WorkflowObject';

entity Capex
{
    key ID : UUID
        @Core.Computed;
    description : String;
    total_cost : Integer;
    contractors : Association to one Contractors;
}

entity Contractors
{
    key contractor : Integer;
    name : String;
}
