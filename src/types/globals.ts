import type { Database as DB } from '../../database.types';

// EXPORTAR TIPOS GLOBALES
declare global {
  // Tipos de tablas
  type Database = DB;
  type TypeOfRepair = DB['public']['Tables']['types_of_repairs']['Row'];
  type ContractType = DB['public']['Tables']['types_of_contract']['Row'];
  type CostCenter = DB['public']['Tables']['cost_center']['Row'];
  type Vehicle = DB['public']['Tables']['vehicles']['Row']; // Anteriormente: Vehicles
  type SubType = DB['public']['Tables']['sub_type']['Row'];
  type VehicleBrand = DB['public']['Tables']['brand_vehicles']['Row']; // Anteriormente: Brand
  type DocumentTypes = DB['public']['Tables']['document_types']['Row']; // Anteriormente: TypeOfDocuments
  type DailyReportStatus = DB['public']['Enums']['daily_report_header_status_new'];
  type DailyReportRowStatus = DB['public']['Enums']['daily_report_status'];
  type Company = DB['public']['Tables']['company']['Row']; // Anteriormente: Company
  type EmployeeDocument = DB['public']['Tables']['documents_employees']['Row']; // Anteriormente: DocumentEmployees
  type Employee = DB['public']['Tables']['employees']['Row']; // Anteriormente: Employees
  type EquipmentDocument = DB['public']['Tables']['documents_equipment']['Row']; // Anteriormente: DocumentEquipment
  type Diagram = DB['public']['Tables']['work_diagram']['Row']; // Anteriormente: Diagram
  type ContractorEmployee = DB['public']['Tables']['contractor_employee']['Row']; // Anteriormente: ContractorEmployee
  type Customer = DB['public']['Tables']['customers']['Row']; // Anteriormente: Customers
  type VehicleModel = DB['public']['Tables']['model_vehicles']['Row']; // Anteriormente: Model
  type VehicleType = DB['public']['Tables']['types_of_vehicles']['Row']; // Anteriormente: type_of_vehicle
  type TypeOfVehicle = DB['public']['Tables']['type']['Row']; // Anteriormente: type_of_vehicle
  type CompanyDocument = DB['public']['Tables']['documents_company']['Row']; // Anteriormente: DocumentsCompany
  type UserProfile = DB['public']['Tables']['profile']['Row']; // Anteriormente: Profile
  type RepairType = DB['public']['Tables']['types_of_repairs']['Row']; // Anteriormente: TypeOfRepair
  type EmployeeDiagram = DB['public']['Tables']['employees_diagram']['Row']; // Anteriormente: DiagramEmployee
  type EmployeeDiagramInsert = DB['public']['Tables']['employees_diagram']['Insert']; // Anteriormente: DiagramEmployee
  type DiagramType = DB['public']['Tables']['diagram_type']['Row']; // Anteriormente: DiagramType
  type City = DB['public']['Tables']['cities']['Row']; // Anteriormente: City
  type Sector = DB['public']['Tables']['sectors']['Row']; // Anteriormente: Sector
  type Province = DB['public']['Tables']['provinces']['Row']; // Anteriormente: Province
  type WorkflowDiagram = DB['public']['Tables']['work_diagram']['Row']; // Anteriormente: WorkflowDiagram
  type HierarchicalPosition = DB['public']['Tables']['hierarchy']['Row']; // Anteriormente: HierarchicalPosition
  type ServiceItem = DB['public']['Tables']['service_items']['Row']; // Anteriormente: ServiceItems
  type MeasureUnit = DB['public']['Tables']['measure_units']['Row']; // Anteriormente: ItemMensureUnits
  type CustomerService = DB['public']['Tables']['customer_services']['Row']; // Anteriormente: CustomerService
  type Profile = DB['public']['Tables']['profile']['Row']; // Anteriormente: Profile
  type CustomForm = DB['public']['Tables']['custom_form']['Row'];
  type CheckListResponse = DB['public']['Tables']['form_answers']['Row'];
  type diagrams_logs = DB['public']['Tables']['diagrams_logs']['Row'];
  type contractor_equipment = DB['public']['Tables']['contractor_equipment']['Row'];
  type contractor = DB['public']['Tables']['contractors']['Row'];
  type customers = DB['public']['Tables']['customers']['Row'];
  type ShareCompanyUsers = DB['public']['Tables']['share_company_users']['Row'];
  type EquipmentsClient = DB['public']['Tables']['equipos_clientes']['Row'];
  type company_position = DB['public']['Tables']['company_positions']['Row'];

  //! Enums
  type VehicleConditionEnum = DB['public']['Enums']['condition_enum']; // Anteriormente: EnumVehicleCondition
  type ModulosEnum = DB['public']['Enums']['modulos'];

  //! EXPORTAR TIPOS CON RELACIONES

  // Tipo para la consulta de work_diagram con las relaciones especificadas explícitamente
  interface WorkDiagramWithRelations extends Omit<WorkflowDiagram, 'active_novelty' | 'inactive_novelty'> {
    active_novelty: DiagramType;
    inactive_novelty: DiagramType;
  }

  // Este tipo es compatible con la consulta que utiliza nombres específicos de claves foráneas
  interface workDiagramWithNovelty extends Omit<Diagram, 'active_novelty' | 'inactive_novelty'> {
    active_novelty: DiagramType;
    inactive_novelty: DiagramType;
  }

  interface CheckListWithAnswer extends Omit<CustomForm, 'form_answers'> {
    form_answers: CheckListAnswerWithForm[]; // Anteriormente: CheckListResponse[]
  }
  interface diagrams_logsWithUser extends Omit<diagrams_logs, 'modified_by'> {
    modified_by: UserProfile; // Anteriormente: Profile
  }
  interface EmployeeDiagramWithDiagramType extends Omit<EmployeeDiagram, 'diagram_type' | 'employee_id'> {
    diagram_type: DiagramType;
    employee_id: Employee;
  }

  interface CheckListAnswerWithForm extends Omit<CheckListResponse, 'form_id'> {
    form_id: CustomForm; // Anteriormente: CustomForm
  }

  // Relaciones de CustomerService
  interface CustomerServiceDetailed extends Omit<CustomerService, 'customer_id' | 'service_id'> {
    // Anteriormente: CustomerServiceWithRelations
    customer_id: Customer; // Anteriormente: Customers
  }

  // Relaciones de ServiceItem
  interface ServiceItemDetailed
    extends Omit<ServiceItem, 'measure_unit' | 'customer_service_id' | 'item_measure_units'> {
    // Anteriormente: ServiceItemsWithRelations
    measure_unit: MeasureUnit; // Anteriormente: ItemMensureUnits
    item_measure_units: MeasureUnit; // Anteriormente: ItemMensureUnits
    customer_service_id: {
      customer_id: Customer; // Anteriormente: Customers
    };
  }

  // Relaciones de Company
  interface CompanyWithProvince extends Omit<Company, 'province_id'> {
    // Anteriormente: CompanyWithRelations
    province_id: Province; // Anteriormente: Province
  }
  interface CompanyWithCity extends Omit<Company, 'city'> {
    // Anteriormente: CompanyWithCity
    city: City; // Anteriormente: City
  }

  // Relaciones de EmployeeDiagram
  interface EmployeeDiagramDetailed extends Omit<EmployeeDiagram, 'employee_id' | 'diagram_type'> {
    // Anteriormente: EmployeesDiagramWithRelations
    employee_id: Employee; // Anteriormente: Employees
    diagram_type: DiagramType; // Anteriormente: DiagramType
  }

  // Relaciones de Employee
  interface EmployeeDetailed
    extends Omit<
      Employee,
      | 'city'
      | 'province'
      | 'workflow_diagram'
      | 'hierarchical_position'
      | 'birthplace'
      | 'contractor_employee'
      | 'company_position'
    > {
    // Anteriormente: EmployeeWithRelations
    city: City; // Anteriormente: City
    province: Province; // Anteriormente: Province
    workflow_diagram: WorkflowDiagram; // Anteriormente: WorkflowDiagram
    hierarchical_position: HierarchicalPosition; // Anteriormente: HierarchicalPosition
    birthplace: City; // Anteriormente: City
    contractor_employee: ContractorEmployeeWithCustomer[]; //
    // Anteriormente: ContractorWithCustomers[]
    company_position: company_position[]; //
    // Anteriormente: ContractorWithCustomers[]
  }
  interface EmployeeWithCompany extends Omit<EmployeeDetailed, 'company_id'> {
    // Anteriormente: EmployeeWithRelationsWithCompany
    company_id: CompanyWithProvince; // Anteriormente: CompanyWithRelations
  }

  // Relaciones de EmployeeDocument
  interface EmployeeDocumentDetailed extends Omit<EmployeeDocument, 'id_document_types' | 'applies'> {
    // Anteriormente: DocumentEmployeeWithRelations
    id_document_types: DocumentTypes; // Anteriormente: TypeOfDocuments
    applies: EmployeeWithCompany; // Anteriormente: EmployeeWithRelationsWithCompany
  }

  // Relaciones de EmployeeDiagram
  interface EmployeeDiagramWithType extends Omit<EmployeeDiagram, 'diagram_type'> {
    // Anteriormente: DiagramEmployeeWithDiagramType
    diagram_type: DiagramType; // Anteriormente: DiagramType
  }

  // Relaciones de CompanyDocument
  interface CompanyDocumentDetailed extends Omit<CompanyDocument, 'id_document_types' | 'user_id'> {
    // Anteriormente: CompanyDocumentTypesWithRelations
    id_document_types: DocumentTypes; // Anteriormente: TypeOfDocuments
    user_id: UserProfile; // Anteriormente: Profile
  }
  interface CompanyDocumentWithType extends Omit<CompanyDocument, 'id_document_types' | 'applies'> {
    // Anteriormente: CompanyDocumentsWithDocumentTypes
    id_document_types: DocumentTypes; // Anteriormente: TypeOfDocuments
    applies: {
      company_id: CompanyWithProvince; // Anteriormente: CompanyWithRelations
    };
  }

  interface contractor_equipmentWithContractor extends Omit<contractor_equipment, 'contractor_id'> {
    // Anteriormente: contractor_equipmentWithContractor
    contractor_id: customers; // Anteriormente: CompanyWithRelations
  }

  // Relaciones para ShareCompanyUsers con Equipment
  interface ShareCompanyUsersWithEquipment extends Omit<ShareCompanyUsers, 'customer_id'> {
    customer_id: CustomerWithContractorEquipment;
  }

  interface CustomerWithContractorEquipment extends Omit<Customer, 'contractor_equipment'> {
    contractor_equipment: ContractorEquipmentWithVehicle[];
  }

  interface ContractorEquipmentWithVehicle extends Omit<contractor_equipment, 'equipment_id'> {
    equipment_id: VehicleWithBrand;
  }

  interface VehicleWithAllRelations extends Omit<Vehicle, 'brand' | 'model' | 'type' | 'types_of_vehicles'> {
    brand: VehicleBrand;
    model: VehicleModel;
    type: VehicleType;
    types_of_vehicles: TypeOfVehicle;
  }

  // Relaciones de Vehicle
  interface VehicleWithBrand extends Omit<Vehicle, 'brand' | 'model' | 'type' | 'contractor_equipment' | 'subType'> {
    // Anteriormente: VehiclesWithBrand
    brand: VehicleBrand; // Anteriormente: Brand
    model: TypeOfVehicle; // Anteriormente: Model
    type: VehicleType; // Anteriormente: type_of_vehicle
    types_of_vehicles: TypeOfVehicle; // Anteriormente: type_of_vehicle
    contractor_equipment: contractor_equipmentWithContractor[]; // Anteriormente: contractor_equipment
    subType: SubType | null; // Puede ser null si el equipo no tiene subtipo
  }
  interface ContractorEmployeeWithCustomer extends Omit<ContractorEmployee, 'customers'> {
    // Anteriormente: ContractorWithCustomers
    customers: Customer; // Anteriormente: Customers
  }
  interface VehicleDetailed extends Omit<Vehicle, 'type' | 'brand' | 'model' | 'type_of_vehicle'> {
    // Anteriormente: VehiclestWithRelations
    type: VehicleType; // Anteriormente: Type
    brand: VehicleBrand; // Anteriormente: Brand
    model: VehicleModel; // Anteriormente: Model
    type_of_vehicle: VehicleType; // Anteriormente: type_of_vehicle
  }
  interface VehicleWithCompany extends Omit<VehicleDetailed, 'company_id' | 'type'> {
    // Anteriormente: VehiclestWithRelationsWithCompany
    company_id: CompanyWithProvince; // Anteriormente: CompanyWithRelations
  }

  // Relaciones de Employee
  interface EmployeeWithContractors extends Omit<Employee, 'contractor_employee'> {
    // Anteriormente: EmployeesWithContractors
    contractor_employee: ContractorEmployeeWithCustomer[]; // Anteriormente: ContractorWithCustomers[]
  }

  // Relaciones de EmployeeDocument
  interface EmployeeDocumentWithContractors extends Omit<EmployeeDocument, 'id_document_types' | 'applies'> {
    // Anteriormente: DocumentEmployeesWithRelations
    id_document_types: DocumentTypes; // Anteriormente: TypeOfDocuments
    applies: EmployeeDetailed; // Anteriormente: EmployeesWithContractors
  }

  // Relaciones de EquipmentDocument
  interface EquipmentDocumentDetailed extends Omit<EquipmentDocument, 'id_document_types' | 'applies'> {
    // Anteriormente: DocumentEquipmentWithRelations
    id_document_types: DocumentTypes; // Anteriormente: TypeOfDocuments
    applies: VehicleDetailed; // Anteriormente: VehiclestWithRelations
  }
  interface EquipmentDocumentWithCompany extends Omit<EquipmentDocument, 'id_document_types' | 'applies'> {
    // Anteriormente: DocumentEquipmentWithRelationsIncludesCompany
    id_document_types: DocumentTypes; // Anteriormente: TypeOfDocuments
    applies: VehicleWithCompany; // Anteriormente: VehiclestWithRelationsWithCompany
  }

  // Relaciones de ShareCompanyUsers
  interface ShareCompanyUsersWithRelations extends Omit<ShareCompanyUsers, 'customer_id'> {
    customer_id: CustomerWithContractorEmployee;
  }

  interface CustomerWithContractorEmployee extends Omit<Customer, 'contractor_employee'> {
    contractor_employee: ContractorEmployeeWithEmployee[];
  }

  interface ContractorEmployeeWithEmployee extends Omit<ContractorEmployee, 'employee_id'> {
    employee_id: Employee;
  }
  interface SharedCompanyWithCompany extends Omit<ShareCompanyUsers, 'company_id'> {
    // Anteriormente: DocumentEquipmentWithRelationsIncludesCompany
    company_id: Company; // Anteriormente: CompanyWithRelations
  }

  // .select('*,sector_customer(sector_id(id,name), customer_id(id,name))')
  interface SectorWithCustomers extends Omit<Sector, 'sector_customer'> {
    sector_customer: Array<{
      sector_id: {
        id: string;
        name: string;
      };
      customer_id: {
        id: string;
        name: string;
      };
    }>;
  }
}

export {};
