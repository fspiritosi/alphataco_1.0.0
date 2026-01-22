  INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)                                                                                             
  VALUES (                                                                                                                                                                          
    '60000000-0000-0000-0000-000000000023',                                                                                                                                         
    '421e96da-5235-4857-bf81-e63336447f13',  -- module: mantenimiento                                                                                                               
    'pendientes_ejecutar',                                                                                                                                                          
    'Pendientes de Ejecutar',                                                                                                                                                       
    'Solicitudes pendientes de ejecutar',                                                                                                                                           
    3,                                                                                                                                                                              
    '60000000-0000-0000-0000-000000000030'   -- parent: maint_operaciones                                                                                                           
  )                                                                                                                                                                                 
  ON CONFLICT (id) DO NOTHING; 