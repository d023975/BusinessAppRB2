using { BusinessAppRB2 as my } from '../db/schema';

@path : 'service/BusinessAppRB2'
@requires : 'BusinessAppRB2Manager'
service BusinessAppRB2Service
{
    @odata.draft.enabled
    entity Capex as
        projection on my.Capex;

    entity Contractors as
        projection on my.Contractors;
}
