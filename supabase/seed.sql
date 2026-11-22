-- Case #001 (the other four cases follow the same shape; see README).
insert into cases(id,number,title,difficulty,category,intro,location,est_minutes,motives,methods) values
('00000000-0000-0000-0000-0000000000c1',1,'The Midnight Murder','easy','Homicide',
 'Industrialist Edmund Vale was found dead in his locked study at 11:45 PM. Four people were in the house. One of them is lying.','Vale Manor, study',20,
 array['Inheritance','Blackmail','Business betrayal'], array['Poisoned brandy','Struck with the paperweight','Staged suicide with a pistol']);
insert into suspects(id,case_id,name,age,relation,background,motive_hint,alibi,statement) values
('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1','Clara Vale',41,'Daughter','Runs the family foundation.','Stands to inherit the estate.','Says she was reading in the library.','"Father and I argued at dinner, nothing more."'),
('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000c1','Martin Ross',55,'Business partner','Co-founded Vale Steel.','Vale planned to buy him out.','Says he left at 10:30 PM.','"I was home before eleven."'),
('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000c1','Ida Penn',38,'Housekeeper','Twelve years in service.','Was owed back wages.','Says she was in the kitchen all night.','"I heard nothing."');
insert into evidence(id,case_id,title,location,description) values
('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','Broken watch','Study floor','Stopped at 11:12 PM, 33 minutes before the body was found.'),
('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000c1','Gate log','Security booth','Martin Ross''s car left the gate at 11:20 PM, not 10:30.'),
('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-0000000000c1','Bloodied paperweight','Desk','Wiped clean but for a smear; blood type matches Vale.'),
('00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-0000000000c1','Buyout letter','Desk drawer','Draft letter cutting Ross out of Vale Steel, dated that week.');
insert into case_solutions values('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a2',2,1,
 'Ross lied about leaving at 10:30. The gate log shows 11:20, matching the watch stopped at 11:12 when Vale was struck. The buyout letter gave him the motive: Vale was cutting him out. Clara and Ida had no link to the weapon or the timeline.',
 array['00000000-0000-0000-0000-0000000000e1'::uuid,'00000000-0000-0000-0000-0000000000e2'::uuid,'00000000-0000-0000-0000-0000000000e4'::uuid]);
