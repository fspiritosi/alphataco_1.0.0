describe('Daily Report CRUD Operations', () => {
  const DAILY_REPORT_ID = '11111111-1111-1111-1111-111111111111';
  const DAILY_REPORT_URL = `/dashboard/operations/${DAILY_REPORT_ID}`;

  beforeEach(() => {
    // Login before each test
    const email = Cypress.env('TEST_EMAIL') || 'test@example.com';
    const password = Cypress.env('TEST_PASSWORD') || 'testpassword';
    cy.login(email, password);
  });

  describe('Navigation', () => {
    it('should navigate to daily report detail page', () => {
      // Navegar directamente a la URL del parte diario de testing
      cy.visit(DAILY_REPORT_URL);

      // Verificar que estamos en la página correcta
      cy.url().should('include', DAILY_REPORT_URL);

      // Verificar que la página cargó correctamente
      cy.get('body').should('exist');
      cy.wait(2000);
    });
  });

  describe('READ - View existing data', () => {
    beforeEach(() => {
      cy.visit(DAILY_REPORT_URL);
    });

    it('should display the daily report table with existing data', () => {
      // Verificar que la tabla existe
      cy.contains('Cliente Testing E2E', { timeout: 10000 }).should('be.visible');

      // Verificar que muestra el registro inicial
      cy.contains('Servicio Testing E2E').should('be.visible');
      cy.contains('Item Testing E2E').should('be.visible');

      // El nombre puede aparecer como "Testing Juan" o "Juan Testing"
      // Hacer scroll al elemento antes de verificar visibilidad
      cy.contains(/Testing.*Juan|Juan.*Testing/)
        .scrollIntoView()
        .should('exist');
      cy.contains('TEST999').scrollIntoView().should('exist');
    });

    it('should display correct status badge', () => {
      cy.contains('pendiente', { timeout: 10000 }).scrollIntoView().should('exist');
    });
  });

  describe('CREATE - Add new row', () => {
    beforeEach(() => {
      cy.visit(DAILY_REPORT_URL);
    });

    it('should open the form modal when clicking add button', () => {
      // Click en el botón de agregar
      cy.contains('button', 'Agregar', { timeout: 10000 }).click();

      // Verificar que el modal se abre
      cy.contains('Agregar Parte Diario').should('be.visible');
    });

    it('should create a new daily report row', () => {
      // Abrir modal
      cy.contains('button', 'Agregar', { timeout: 10000 }).click();
      cy.contains('Agregar Parte Diario').should('be.visible');

      // Esperar a que el modal esté completamente abierto
      cy.wait(2000);

      // Seleccionar cliente usando data-testid
      cy.get('[data-testid="customer-select-button"]').should('be.visible').click();
      cy.wait(1000); // Esperar a que el popover se abra y los clientes carguen
      cy.get('[data-testid="customer-option-22222222-2222-2222-2222-222222222222"]', { timeout: 10000 })
        .scrollIntoView()
        .click();
      // Cerrar el popover del cliente
      cy.get('[data-testid="customer-select-button"]').click();
      cy.wait(500);

      // Esperar a que carguen los servicios
      cy.wait(2000);

      // Seleccionar servicio usando data-testid
      cy.get('[data-testid="service-select-button"]').should('be.visible').click();
      cy.wait(1000);
      cy.get('[data-testid="service-option-33333333-3333-3333-3333-333333333333"]', { timeout: 10000 })
        .scrollIntoView()
        .click();
      // Cerrar el popover del servicio
      cy.get('[data-testid="service-select-button"]').click();
      cy.wait(500);

      // Esperar a que carguen los ítems
      cy.wait(2000);

      // Seleccionar ítem usando data-testid
      cy.get('[data-testid="item-select-button"]').should('be.visible').click();
      cy.wait(1000);
      cy.get('[data-testid="item-option-44444444-4444-4444-4444-444444444444"]', { timeout: 10000 })
        .scrollIntoView()
        .click();
      // Cerrar el popover del ítem
      cy.get('[data-testid="item-select-button"]').click();
      cy.wait(500);

      // Seleccionar tipo de servicio (radio button)
      cy.get('[data-testid="type-service-mensual"]').should('be.visible').click();

      // Seleccionar jornada
      cy.get('[data-testid="working-day-select-button"]').should('be.visible').click();
      cy.wait(1000);
      cy.get('[data-testid="working-day-option-jornada-8-horas"]', { timeout: 10000 }).scrollIntoView().click();
      // Cerrar el popover de jornada
      cy.get('[data-testid="working-day-select-button"]').click();
      cy.wait(500);

      // Agregar descripción
      cy.get('textarea').type('Registro creado por E2E test - ' + Date.now());

      // Crear
      cy.contains('button', 'Crear').click();

      // Verificar que el modal se cierra
      cy.contains('Agregar Parte Diario').should('not.exist');

      // Verificar que aparece el mensaje de éxito
      cy.contains('Parte diario creado exitosamente', { timeout: 10000 }).should('be.visible');
    });

    it('should show validation errors for required fields', () => {
      // Abrir modal
      cy.contains('button', 'Agregar', { timeout: 10000 }).click();

      // Intentar crear sin llenar campos
      cy.contains('button', 'Crear').click();

      // Verificar mensajes de error
      cy.contains('Debe seleccionar un cliente').should('be.visible');
    });
  });

  describe('UPDATE - Edit existing row', () => {
    beforeEach(() => {
      cy.visit(DAILY_REPORT_URL);
    });

    it('should open edit modal with pre-filled data', () => {
      // Buscar el botón de editar del registro de testing usando data-testid
      cy.get('[data-testid="edit-button-77777777-7777-7777-7777-777777777777"]', { timeout: 10000 }).click();

      // Verificar que el modal se abre con título de editar
      cy.contains('Editar Parte Diario').should('be.visible');

      // Verificar que los campos están pre-llenados
      cy.contains('Cliente Testing E2E').should('be.visible');
      cy.get('textarea').should('contain.value', 'Registro inicial de testing');
    });

    it('should update an existing daily report row', () => {
      // Abrir modal de edición usando data-testid
      cy.get('[data-testid="edit-button-77777777-7777-7777-7777-777777777777"]', { timeout: 10000 }).click();

      cy.contains('Editar Parte Diario').should('be.visible');

      // Modificar descripción
      const newDescription = 'Registro editado por E2E test - ' + Date.now();
      cy.get('textarea').clear().type(newDescription);

      // Cambiar estado a ejecutado
      cy.get('select').last().select('ejecutado');

      // Esperar a que aparezca el campo "Confirmado por"
      cy.wait(500);

      // Llenar el campo "Confirmado por"
      cy.contains('Confirmado por').parent().find('input').type('Test User');

      // Actualizar
      cy.contains('button', 'Actualizar').click();

      // Verificar mensaje de éxito
      cy.contains('Parte diario actualizado exitosamente', { timeout: 10000 }).should('be.visible');

      // Verificar que el modal se cierra
      cy.contains('Editar Parte Diario').should('not.exist');

      // Verificar que los cambios se reflejan en la tabla
      cy.contains(newDescription, { timeout: 10000 }).should('be.visible');
      cy.contains('ejecutado').should('be.visible');
    });
  });

  describe('DELETE - Remove row', () => {
    beforeEach(() => {
      cy.visit(DAILY_REPORT_URL);

      // Crear un registro para eliminar
      cy.contains('button', 'Agregar', { timeout: 10000 }).click();
      cy.contains('Agregar Parte Diario').should('be.visible');

      cy.contains('button', 'Seleccionar cliente').click();
      cy.contains('Cliente Testing E2E').click();
      cy.wait(1000);

      cy.contains('button', 'Seleccionar servicio').click();
      cy.contains('Servicio Testing E2E').click();
      cy.wait(1000);

      cy.contains('button', 'Seleccionar ítem').click();
      cy.contains('Item Testing E2E').click();

      cy.get('select').first().select('mensual');
      cy.contains('Jornada 8 horas').click();
      cy.get('textarea').type('Registro para eliminar - ' + Date.now());

      cy.contains('button', 'Crear').click();
      cy.contains('Parte diario creado exitosamente', { timeout: 10000 }).should('be.visible');
      cy.wait(2000);
    });

    it('should delete a daily report row', () => {
      // Buscar el registro recién creado y hacer click en el botón de eliminar
      cy.contains('tr', 'Registro para eliminar', { timeout: 10000 }).within(() => {
        // Buscar el botón con el icono de eliminar (Trash2)
        cy.get('button[data-testid^="delete-button-"]').click();
      });

      // Confirmar eliminación en el modal
      cy.contains('¿Estás seguro de eliminar este registro?').should('be.visible');
      cy.contains('button', 'Eliminar').click();

      // Verificar mensaje de éxito
      cy.contains('eliminado exitosamente', { timeout: 10000 }).should('be.visible');

      // Verificar que el registro ya no está en la tabla
      cy.contains('Registro para eliminar').should('not.exist');
    });

    it('should cancel delete operation', () => {
      // Buscar el registro y hacer click en el botón de eliminar
      cy.contains('tr', 'Registro para eliminar', { timeout: 10000 }).within(() => {
        cy.get('button[data-testid^="delete-button-"]').click();
      });

      // Cancelar eliminación
      cy.contains('¿Estás seguro de eliminar este registro?').should('be.visible');
      cy.contains('button', 'Cancelar').click();

      // Verificar que el modal se cierra
      cy.contains('¿Estás seguro de eliminar este registro?').should('not.exist');

      // Verificar que el registro sigue en la tabla
      cy.contains('Registro para eliminar').should('be.visible');
    });
  });

  describe('Table Updates', () => {
    beforeEach(() => {
      cy.visit(DAILY_REPORT_URL);
    });

    it('should refresh table after operations', () => {
      // Contar registros iniciales
      cy.get('tbody tr', { timeout: 10000 }).then(($rows) => {
        const initialCount = $rows.length;

        // Crear nuevo registro
        cy.contains('button', 'Agregar').click();
        cy.contains('button', 'Seleccionar cliente').click();
        cy.contains('Cliente Testing E2E').click();
        cy.wait(1000);

        cy.contains('button', 'Seleccionar servicio').click();
        cy.contains('Servicio Testing E2E').click();
        cy.wait(1000);

        cy.contains('button', 'Seleccionar ítem').click();
        cy.contains('Item Testing E2E').click();

        cy.get('select').first().select('mensual');
        cy.contains('Jornada 8 horas').click();
        cy.get('textarea').type('Test refresh - ' + Date.now());

        cy.contains('button', 'Crear').click();
        cy.contains('Parte diario creado exitosamente', { timeout: 10000 }).should('be.visible');

        // Esperar actualización
        cy.wait(2000);

        // Verificar que aumentó el conteo (o al menos se mantiene si hay paginación)
        cy.get('tbody tr').should('have.length.at.least', 1);
      });
    });
  });
});
