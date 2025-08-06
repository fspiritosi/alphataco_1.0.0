export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
  public: {
    Tables: {
      aptitudes_tecnicas: {
        Row: {
          id: string;
          is_active: boolean | null;
          nombre: string;
        };
        Insert: {
          id?: string;
          is_active?: boolean | null;
          nombre: string;
        };
        Update: {
          id?: string;
          is_active?: boolean | null;
          nombre?: string;
        };
        Relationships: [];
      };
      aptitudes_tecnicas_puestos: {
        Row: {
          aptitud_id: string;
          created_at: string;
          puesto_id: string;
        };
        Insert: {
          aptitud_id: string;
          created_at?: string;
          puesto_id: string;
        };
        Update: {
          aptitud_id?: string;
          created_at?: string;
          puesto_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'aptitudes_tecnicas_puestos_aptitud_id_fkey';
            columns: ['aptitud_id'];
            isOneToOne: false;
            referencedRelation: 'aptitudes_tecnicas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'aptitudes_tecnicas_puestos_puesto_id_fkey';
            columns: ['puesto_id'];
            isOneToOne: false;
            referencedRelation: 'company_positions';
            referencedColumns: ['id'];
          },
        ];
      };
      area_province: {
        Row: {
          area_id: string;
          id: string;
          province_id: number;
        };
        Insert: {
          area_id: string;
          id?: string;
          province_id: number;
        };
        Update: {
          area_id?: string;
          id?: string;
          province_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'area_province_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas_cliente';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'area_province_province_id_fkey';
            columns: ['province_id'];
            isOneToOne: false;
            referencedRelation: 'provinces';
            referencedColumns: ['id'];
          },
        ];
      };
      areas_cliente: {
        Row: {
          customer_id: string;
          descripcion_corta: string | null;
          id: string;
          nombre: string;
        };
        Insert: {
          customer_id: string;
          descripcion_corta?: string | null;
          id?: string;
          nombre: string;
        };
        Update: {
          customer_id?: string;
          descripcion_corta?: string | null;
          id?: string;
          nombre?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'areas_cliente_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      assing_customer: {
        Row: {
          created_at: string;
          customer_id: string;
          employee_id: string;
          equipment_id: string;
          id: number;
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          employee_id: string;
          equipment_id: string;
          id?: number;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          employee_id?: string;
          equipment_id?: string;
          id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'public_assing_customer_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_assing_customer_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      brand_vehicles: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: number;
          is_active: boolean | null;
          name: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: number;
          is_active?: boolean | null;
          name?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: number;
          is_active?: boolean | null;
          name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'brand_vehicles_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      category: {
        Row: {
          covenant_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean | null;
          name: string | null;
        };
        Insert: {
          covenant_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
        };
        Update: {
          covenant_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'category_covenant_id_fkey';
            columns: ['covenant_id'];
            isOneToOne: false;
            referencedRelation: 'covenant';
            referencedColumns: ['id'];
          },
        ];
      };
      category_employee: {
        Row: {
          category_id: string | null;
          created_at: string;
          emplyee_id: string | null;
          id: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          emplyee_id?: string | null;
          id?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          emplyee_id?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_covenant_category_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'category';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_covenant_employee_emplyee_id_fkey';
            columns: ['emplyee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      cities: {
        Row: {
          created_at: string;
          id: number;
          name: string;
          province_id: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          name: string;
          province_id: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          name?: string;
          province_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'cities_province_id_fkey';
            columns: ['province_id'];
            isOneToOne: false;
            referencedRelation: 'provinces';
            referencedColumns: ['id'];
          },
        ];
      };
      companies_employees: {
        Row: {
          company_id: string | null;
          employee_id: string;
          id: string;
        };
        Insert: {
          company_id?: string | null;
          employee_id: string;
          id?: string;
        };
        Update: {
          company_id?: string | null;
          employee_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'companies_employees_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'companies_employees_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      company: {
        Row: {
          address: string;
          by_defect: boolean | null;
          city: number;
          company_cuit: string;
          company_logo: string | null;
          company_name: string;
          contact_email: string;
          contact_phone: string;
          country: string;
          description: string;
          id: string;
          industry: string;
          is_active: boolean;
          owner_id: string | null;
          province_id: number | null;
          website: string | null;
        };
        Insert: {
          address: string;
          by_defect?: boolean | null;
          city: number;
          company_cuit: string;
          company_logo?: string | null;
          company_name: string;
          contact_email: string;
          contact_phone: string;
          country: string;
          description: string;
          id?: string;
          industry: string;
          is_active?: boolean;
          owner_id?: string | null;
          province_id?: number | null;
          website?: string | null;
        };
        Update: {
          address?: string;
          by_defect?: boolean | null;
          city?: number;
          company_cuit?: string;
          company_logo?: string | null;
          company_name?: string;
          contact_email?: string;
          contact_phone?: string;
          country?: string;
          description?: string;
          id?: string;
          industry?: string;
          is_active?: boolean;
          owner_id?: string | null;
          province_id?: number | null;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'company_city_fkey';
            columns: ['city'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'company_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'company_province_id_fkey';
            columns: ['province_id'];
            isOneToOne: false;
            referencedRelation: 'provinces';
            referencedColumns: ['id'];
          },
        ];
      };
      company_positions: {
        Row: {
          created_at: string;
          hierarchical_position_id: string[] | null;
          id: string;
          is_active: boolean | null;
          name: string | null;
        };
        Insert: {
          created_at?: string;
          hierarchical_position_id?: string[] | null;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
        };
        Update: {
          created_at?: string;
          hierarchical_position_id?: string[] | null;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          company_id: string | null;
          constact_email: string | null;
          contact_charge: string | null;
          contact_name: string | null;
          contact_phone: number | null;
          created_at: string;
          customer_id: string | null;
          id: string;
          is_active: boolean | null;
          reason_for_termination: string | null;
          termination_date: string | null;
        };
        Insert: {
          company_id?: string | null;
          constact_email?: string | null;
          contact_charge?: string | null;
          contact_name?: string | null;
          contact_phone?: number | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          reason_for_termination?: string | null;
          termination_date?: string | null;
        };
        Update: {
          company_id?: string | null;
          constact_email?: string | null;
          contact_charge?: string | null;
          contact_name?: string | null;
          contact_phone?: number | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          reason_for_termination?: string | null;
          termination_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contacts_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_contacts_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      contractor_employee: {
        Row: {
          contractor_id: string | null;
          created_at: string;
          employee_id: string | null;
          id: string;
        };
        Insert: {
          contractor_id?: string | null;
          created_at?: string;
          employee_id?: string | null;
          id?: string;
        };
        Update: {
          contractor_id?: string | null;
          created_at?: string;
          employee_id?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contractor_employee_contractor_id_fkey';
            columns: ['contractor_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contractor_employee_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      contractor_equipment: {
        Row: {
          contractor_id: string | null;
          created_at: string;
          equipment_id: string | null;
          id: string;
        };
        Insert: {
          contractor_id?: string | null;
          created_at?: string;
          equipment_id?: string | null;
          id?: string;
        };
        Update: {
          contractor_id?: string | null;
          created_at?: string;
          equipment_id?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contractor_equipment_contractor_id_fkey';
            columns: ['contractor_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contractor_equipment_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      contractors: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      cost_center: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [];
      };
      countries: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      covenant: {
        Row: {
          company_id: string;
          created_at: string;
          guild_id: string;
          id: string;
          is_active: boolean | null;
          name: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          guild_id: string;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          guild_id?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'covenant_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'covenant_guild_id_fkey';
            columns: ['guild_id'];
            isOneToOne: false;
            referencedRelation: 'guild';
            referencedColumns: ['id'];
          },
        ];
      };
      custom_form: {
        Row: {
          company_id: string;
          created_at: string;
          form: Json;
          id: string;
          name: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          form: Json;
          id?: string;
          name: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          form?: Json;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'custom_form_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_services: {
        Row: {
          company_id: string | null;
          contract_number: string | null;
          created_at: string;
          customer_id: string | null;
          id: string;
          is_active: boolean | null;
          service_name: string | null;
          service_start: string | null;
          service_validity: string | null;
        };
        Insert: {
          company_id?: string | null;
          contract_number?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          service_name?: string | null;
          service_start?: string | null;
          service_validity?: string | null;
        };
        Update: {
          company_id?: string | null;
          contract_number?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          service_name?: string | null;
          service_start?: string | null;
          service_validity?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_services_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_customer_services_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_customer_services_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          address: string | null;
          client_email: string | null;
          client_phone: number | null;
          company_id: string;
          created_at: string;
          cuit: number;
          id: string;
          is_active: boolean | null;
          name: string;
          reason_for_termination: string | null;
          termination_date: string | null;
        };
        Insert: {
          address?: string | null;
          client_email?: string | null;
          client_phone?: number | null;
          company_id: string;
          created_at?: string;
          cuit: number;
          id?: string;
          is_active?: boolean | null;
          name: string;
          reason_for_termination?: string | null;
          termination_date?: string | null;
        };
        Update: {
          address?: string | null;
          client_email?: string | null;
          client_phone?: number | null;
          company_id?: string;
          created_at?: string;
          cuit?: number;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          reason_for_termination?: string | null;
          termination_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      dailyreport: {
        Row: {
          company_id: string;
          created_at: string | null;
          creation_date: string | null;
          date: string;
          id: string;
          is_active: boolean | null;
          status: Database['public']['Enums']['daily_report_header_status_new'];
          updated_at: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string | null;
          creation_date?: string | null;
          date: string;
          id?: string;
          is_active?: boolean | null;
          status?: Database['public']['Enums']['daily_report_header_status_new'];
          updated_at?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string | null;
          creation_date?: string | null;
          date?: string;
          id?: string;
          is_active?: boolean | null;
          status?: Database['public']['Enums']['daily_report_header_status_new'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'public_dailyreport_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      dailyreport_customer_equipment_relations: {
        Row: {
          customer_equipment_id: string;
          daily_report_row_id: string;
          id: string;
        };
        Insert: {
          customer_equipment_id: string;
          daily_report_row_id: string;
          id?: string;
        };
        Update: {
          customer_equipment_id?: string;
          daily_report_row_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dailyreport_customer_equipment_relat_customer_equipment_id_fkey';
            columns: ['customer_equipment_id'];
            isOneToOne: false;
            referencedRelation: 'equipos_clientes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dailyreport_customer_equipment_relatio_daily_report_row_id_fkey';
            columns: ['daily_report_row_id'];
            isOneToOne: false;
            referencedRelation: 'dailyreportrows';
            referencedColumns: ['id'];
          },
        ];
      };
      dailyreportemployeerelations: {
        Row: {
          created_at: string | null;
          daily_report_row_id: string | null;
          employee_id: string | null;
          id: string;
        };
        Insert: {
          created_at?: string | null;
          daily_report_row_id?: string | null;
          employee_id?: string | null;
          id?: string;
        };
        Update: {
          created_at?: string | null;
          daily_report_row_id?: string | null;
          employee_id?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dailyreportemployeerelations_daily_report_row_id_fkey';
            columns: ['daily_report_row_id'];
            isOneToOne: false;
            referencedRelation: 'dailyreportrows';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dailyreportemployeerelations_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      dailyreportequipmentrelations: {
        Row: {
          created_at: string | null;
          daily_report_row_id: string | null;
          equipment_id: string | null;
          id: string;
        };
        Insert: {
          created_at?: string | null;
          daily_report_row_id?: string | null;
          equipment_id?: string | null;
          id?: string;
        };
        Update: {
          created_at?: string | null;
          daily_report_row_id?: string | null;
          equipment_id?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dailyreportequipmentrelations_daily_report_row_id_fkey';
            columns: ['daily_report_row_id'];
            isOneToOne: false;
            referencedRelation: 'dailyreportrows';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dailyreportequipmentrelations_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      dailyreportrows: {
        Row: {
          areas_service_id: string | null;
          cancel_reason: string | null;
          created_at: string | null;
          customer_id: string | null;
          daily_report_id: string | null;
          description: string | null;
          document_path: string | null;
          end_time: string | null;
          id: string;
          item_id: string | null;
          remit_number: string | null;
          sector_service_id: string | null;
          service_id: string | null;
          start_time: string | null;
          status: Database['public']['Enums']['daily_report_status'];
          type_service: Database['public']['Enums']['daily_report_type_enum'] | null;
          updated_at: string | null;
          working_day: string | null;
        };
        Insert: {
          areas_service_id?: string | null;
          cancel_reason?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          daily_report_id?: string | null;
          description?: string | null;
          document_path?: string | null;
          end_time?: string | null;
          id?: string;
          item_id?: string | null;
          remit_number?: string | null;
          sector_service_id?: string | null;
          service_id?: string | null;
          start_time?: string | null;
          status?: Database['public']['Enums']['daily_report_status'];
          type_service?: Database['public']['Enums']['daily_report_type_enum'] | null;
          updated_at?: string | null;
          working_day?: string | null;
        };
        Update: {
          areas_service_id?: string | null;
          cancel_reason?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          daily_report_id?: string | null;
          description?: string | null;
          document_path?: string | null;
          end_time?: string | null;
          id?: string;
          item_id?: string | null;
          remit_number?: string | null;
          sector_service_id?: string | null;
          service_id?: string | null;
          start_time?: string | null;
          status?: Database['public']['Enums']['daily_report_status'];
          type_service?: Database['public']['Enums']['daily_report_type_enum'] | null;
          updated_at?: string | null;
          working_day?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'dailyreportrows_areas_service_id_fkey';
            columns: ['areas_service_id'];
            isOneToOne: false;
            referencedRelation: 'service_areas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dailyreportrows_daily_report_id_fkey';
            columns: ['daily_report_id'];
            isOneToOne: false;
            referencedRelation: 'dailyreport';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dailyreportrows_sector_service_id_fkey';
            columns: ['sector_service_id'];
            isOneToOne: false;
            referencedRelation: 'service_sectors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dailyreportrows_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'customer_services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_dailyreportrows_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_dailyreportrows_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'service_items';
            referencedColumns: ['id'];
          },
        ];
      };
      dailyreportrows_history: {
        Row: {
          action_type: string;
          changed_by: string | null;
          changed_data: Json;
          changed_fields: Json | null;
          created_at: string;
          daily_report_row_id: string;
          id: string;
          metadata: Json | null;
          reassignment_reason: string | null;
          related_id: string | null;
          related_table: string | null;
        };
        Insert: {
          action_type: string;
          changed_by?: string | null;
          changed_data: Json;
          changed_fields?: Json | null;
          created_at?: string;
          daily_report_row_id: string;
          id?: string;
          metadata?: Json | null;
          reassignment_reason?: string | null;
          related_id?: string | null;
          related_table?: string | null;
        };
        Update: {
          action_type?: string;
          changed_by?: string | null;
          changed_data?: Json;
          changed_fields?: Json | null;
          created_at?: string;
          daily_report_row_id?: string;
          id?: string;
          metadata?: Json | null;
          reassignment_reason?: string | null;
          related_id?: string | null;
          related_table?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'dailyreportrows_history_daily_report_row_id_fkey';
            columns: ['daily_report_row_id'];
            isOneToOne: false;
            referencedRelation: 'dailyreportrows';
            referencedColumns: ['id'];
          },
        ];
      };
      diagram_type: {
        Row: {
          color: string;
          company_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string | null;
          short_description: string;
          work_active: boolean | null;
        };
        Insert: {
          color: string;
          company_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string | null;
          short_description: string;
          work_active?: boolean | null;
        };
        Update: {
          color?: string;
          company_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string | null;
          short_description?: string;
          work_active?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'public_diagram_type_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      diagrams_logs: {
        Row: {
          created_at: string;
          description: string;
          diagram_id: string;
          employee_id: string;
          id: string;
          modified_by: string | null;
          prev_date: string;
          prev_state: string;
          state: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          diagram_id: string;
          employee_id: string;
          id?: string;
          modified_by?: string | null;
          prev_date: string;
          prev_state: string;
          state: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          diagram_id?: string;
          employee_id?: string;
          id?: string;
          modified_by?: string | null;
          prev_date?: string;
          prev_state?: string;
          state?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'diagrams_logs_diagram_id_fkey';
            columns: ['diagram_id'];
            isOneToOne: false;
            referencedRelation: 'diagram_type';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diagrams_logs_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diagrams_logs_modified_by_fkey';
            columns: ['modified_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      document_types: {
        Row: {
          applies: Database['public']['Enums']['document_applies'];
          company_id: string | null;
          conditions: Json[] | null;
          created_at: string;
          description: string | null;
          down_document: boolean | null;
          explired: boolean;
          id: string;
          is_active: boolean;
          is_it_montlhy: boolean | null;
          mandatory: boolean;
          multiresource: boolean;
          name: string;
          private: boolean | null;
          special: boolean;
        };
        Insert: {
          applies: Database['public']['Enums']['document_applies'];
          company_id?: string | null;
          conditions?: Json[] | null;
          created_at?: string;
          description?: string | null;
          down_document?: boolean | null;
          explired: boolean;
          id?: string;
          is_active?: boolean;
          is_it_montlhy?: boolean | null;
          mandatory: boolean;
          multiresource: boolean;
          name: string;
          private?: boolean | null;
          special: boolean;
        };
        Update: {
          applies?: Database['public']['Enums']['document_applies'];
          company_id?: string | null;
          conditions?: Json[] | null;
          created_at?: string;
          description?: string | null;
          down_document?: boolean | null;
          explired?: boolean;
          id?: string;
          is_active?: boolean;
          is_it_montlhy?: boolean | null;
          mandatory?: boolean;
          multiresource?: boolean;
          name?: string;
          private?: boolean | null;
          special?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'document_types_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      documents_company: {
        Row: {
          applies: string;
          created_at: string;
          deny_reason: string | null;
          document_path: string | null;
          id: string;
          id_document_types: string | null;
          is_active: boolean | null;
          period: string | null;
          state: Database['public']['Enums']['state'];
          user_id: string | null;
          validity: string | null;
        };
        Insert: {
          applies: string;
          created_at?: string;
          deny_reason?: string | null;
          document_path?: string | null;
          id?: string;
          id_document_types?: string | null;
          is_active?: boolean | null;
          period?: string | null;
          state?: Database['public']['Enums']['state'];
          user_id?: string | null;
          validity?: string | null;
        };
        Update: {
          applies?: string;
          created_at?: string;
          deny_reason?: string | null;
          document_path?: string | null;
          id?: string;
          id_document_types?: string | null;
          is_active?: boolean | null;
          period?: string | null;
          state?: Database['public']['Enums']['state'];
          user_id?: string | null;
          validity?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_company_applies_fkey';
            columns: ['applies'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_company_id_document_types_fkey';
            columns: ['id_document_types'];
            isOneToOne: false;
            referencedRelation: 'document_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_company_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      documents_contracts: {
        Row: {
          contract_id: string;
          created_at: string | null;
          date: string | null;
          description: string | null;
          id: string;
          name: string;
          path: string;
          size: string;
          type: string;
        };
        Insert: {
          contract_id: string;
          created_at?: string | null;
          date?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          path: string;
          size: string;
          type: string;
        };
        Update: {
          contract_id?: string;
          created_at?: string | null;
          date?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          path?: string;
          size?: string;
          type?: string;
        };
        Relationships: [];
      };
      documents_employees: {
        Row: {
          applies: string | null;
          created_at: string;
          deny_reason: string | null;
          document_path: string | null;
          id: string;
          id_document_types: string | null;
          is_active: boolean | null;
          period: string | null;
          state: Database['public']['Enums']['state'];
          user_id: string | null;
          validity: string | null;
        };
        Insert: {
          applies?: string | null;
          created_at?: string;
          deny_reason?: string | null;
          document_path?: string | null;
          id?: string;
          id_document_types?: string | null;
          is_active?: boolean | null;
          period?: string | null;
          state?: Database['public']['Enums']['state'];
          user_id?: string | null;
          validity?: string | null;
        };
        Update: {
          applies?: string | null;
          created_at?: string;
          deny_reason?: string | null;
          document_path?: string | null;
          id?: string;
          id_document_types?: string | null;
          is_active?: boolean | null;
          period?: string | null;
          state?: Database['public']['Enums']['state'];
          user_id?: string | null;
          validity?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_employees_applies_fkey';
            columns: ['applies'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_employees_id_document_types_fkey';
            columns: ['id_document_types'];
            isOneToOne: false;
            referencedRelation: 'document_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_employees_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      documents_employees_logs: {
        Row: {
          documents_employees_id: string;
          id: number;
          modified_by: string;
          updated_at: string;
        };
        Insert: {
          documents_employees_id: string;
          id?: number;
          modified_by: string;
          updated_at?: string;
        };
        Update: {
          documents_employees_id?: string;
          id?: number;
          modified_by?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_documents_employees_logs_documents_employees_id_fkey';
            columns: ['documents_employees_id'];
            isOneToOne: false;
            referencedRelation: 'documents_employees';
            referencedColumns: ['id'];
          },
        ];
      };
      documents_equipment: {
        Row: {
          applies: string | null;
          created_at: string;
          deny_reason: string | null;
          document_path: string | null;
          id: string;
          id_document_types: string | null;
          is_active: boolean | null;
          period: string | null;
          state: Database['public']['Enums']['state'] | null;
          user_id: string | null;
          validity: string | null;
        };
        Insert: {
          applies?: string | null;
          created_at?: string;
          deny_reason?: string | null;
          document_path?: string | null;
          id?: string;
          id_document_types?: string | null;
          is_active?: boolean | null;
          period?: string | null;
          state?: Database['public']['Enums']['state'] | null;
          user_id?: string | null;
          validity?: string | null;
        };
        Update: {
          applies?: string | null;
          created_at?: string;
          deny_reason?: string | null;
          document_path?: string | null;
          id?: string;
          id_document_types?: string | null;
          is_active?: boolean | null;
          period?: string | null;
          state?: Database['public']['Enums']['state'] | null;
          user_id?: string | null;
          validity?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_equipment_applies_fkey';
            columns: ['applies'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_equipment_id_document_types_fkey';
            columns: ['id_document_types'];
            isOneToOne: false;
            referencedRelation: 'document_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_equipment_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      documents_equipment_logs: {
        Row: {
          documents_equipment_id: string;
          id: number;
          modified_by: string;
          updated_at: string;
        };
        Insert: {
          documents_equipment_id: string;
          id?: number;
          modified_by: string;
          updated_at?: string;
        };
        Update: {
          documents_equipment_id?: string;
          id?: number;
          modified_by?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_documents_equipment_logs_documents_equipment_id_fkey';
            columns: ['documents_equipment_id'];
            isOneToOne: false;
            referencedRelation: 'documents_equipment';
            referencedColumns: ['id'];
          },
        ];
      };
      empleado_aptitudes: {
        Row: {
          aptitud_id: string;
          created_at: string | null;
          empleado_id: string;
          fecha_verificacion: string | null;
          id: string;
          observaciones: string | null;
          tiene_aptitud: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          aptitud_id: string;
          created_at?: string | null;
          empleado_id: string;
          fecha_verificacion?: string | null;
          id?: string;
          observaciones?: string | null;
          tiene_aptitud?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          aptitud_id?: string;
          created_at?: string | null;
          empleado_id?: string;
          fecha_verificacion?: string | null;
          id?: string;
          observaciones?: string | null;
          tiene_aptitud?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'empleado_aptitudes_aptitud_id_fkey';
            columns: ['aptitud_id'];
            isOneToOne: false;
            referencedRelation: 'aptitudes_tecnicas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'empleado_aptitudes_empleado_id_fkey';
            columns: ['empleado_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      employees: {
        Row: {
          affiliate_status: Database['public']['Enums']['affiliate_status_enum'] | null;
          allocated_to: string[] | null;
          birthplace: string;
          born_date: string | null;
          category_id: string | null;
          city: number | null;
          company_id: string | null;
          company_position: string | null;
          cost_center_id: string | null;
          covenants_id: string | null;
          created_at: string;
          cuil: string;
          date_of_admission: string;
          document_number: string;
          document_type: Database['public']['Enums']['document_type_enum'] | null;
          email: string | null;
          file: string;
          firstname: string;
          gender: Database['public']['Enums']['gender_enum'] | null;
          guild_id: string | null;
          hierarchical_position: string | null;
          id: string;
          is_active: boolean | null;
          lastname: string;
          level_of_education: Database['public']['Enums']['level_of_education_enum'] | null;
          marital_status: Database['public']['Enums']['marital_status_enum'] | null;
          nationality: Database['public']['Enums']['nationality_enum'] | null;
          normal_hours: string | null;
          phone: string;
          picture: string | null;
          postal_code: string | null;
          province: number;
          reason_for_termination: Database['public']['Enums']['reason_for_termination_enum'] | null;
          status: Database['public']['Enums']['status_type'] | null;
          street: string;
          street_number: string;
          termination_date: string | null;
          type_of_contract: string | null;
          workflow_diagram: string | null;
        };
        Insert: {
          affiliate_status?: Database['public']['Enums']['affiliate_status_enum'] | null;
          allocated_to?: string[] | null;
          birthplace: string;
          born_date?: string | null;
          category_id?: string | null;
          city?: number | null;
          company_id?: string | null;
          company_position?: string | null;
          cost_center_id?: string | null;
          covenants_id?: string | null;
          created_at?: string;
          cuil: string;
          date_of_admission: string;
          document_number: string;
          document_type?: Database['public']['Enums']['document_type_enum'] | null;
          email?: string | null;
          file: string;
          firstname: string;
          gender?: Database['public']['Enums']['gender_enum'] | null;
          guild_id?: string | null;
          hierarchical_position?: string | null;
          id?: string;
          is_active?: boolean | null;
          lastname: string;
          level_of_education?: Database['public']['Enums']['level_of_education_enum'] | null;
          marital_status?: Database['public']['Enums']['marital_status_enum'] | null;
          nationality?: Database['public']['Enums']['nationality_enum'] | null;
          normal_hours?: string | null;
          phone: string;
          picture?: string | null;
          postal_code?: string | null;
          province: number;
          reason_for_termination?: Database['public']['Enums']['reason_for_termination_enum'] | null;
          status?: Database['public']['Enums']['status_type'] | null;
          street: string;
          street_number: string;
          termination_date?: string | null;
          type_of_contract?: string | null;
          workflow_diagram?: string | null;
        };
        Update: {
          affiliate_status?: Database['public']['Enums']['affiliate_status_enum'] | null;
          allocated_to?: string[] | null;
          birthplace?: string;
          born_date?: string | null;
          category_id?: string | null;
          city?: number | null;
          company_id?: string | null;
          company_position?: string | null;
          cost_center_id?: string | null;
          covenants_id?: string | null;
          created_at?: string;
          cuil?: string;
          date_of_admission?: string;
          document_number?: string;
          document_type?: Database['public']['Enums']['document_type_enum'] | null;
          email?: string | null;
          file?: string;
          firstname?: string;
          gender?: Database['public']['Enums']['gender_enum'] | null;
          guild_id?: string | null;
          hierarchical_position?: string | null;
          id?: string;
          is_active?: boolean | null;
          lastname?: string;
          level_of_education?: Database['public']['Enums']['level_of_education_enum'] | null;
          marital_status?: Database['public']['Enums']['marital_status_enum'] | null;
          nationality?: Database['public']['Enums']['nationality_enum'] | null;
          normal_hours?: string | null;
          phone?: string;
          picture?: string | null;
          postal_code?: string | null;
          province?: number;
          reason_for_termination?: Database['public']['Enums']['reason_for_termination_enum'] | null;
          status?: Database['public']['Enums']['status_type'] | null;
          street?: string;
          street_number?: string;
          termination_date?: string | null;
          type_of_contract?: string | null;
          workflow_diagram?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employees_birthplace_fkey';
            columns: ['birthplace'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'category';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_city_fkey';
            columns: ['city'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_company_position_fkey';
            columns: ['company_position'];
            isOneToOne: false;
            referencedRelation: 'company_positions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_cost_center_id_fkey';
            columns: ['cost_center_id'];
            isOneToOne: false;
            referencedRelation: 'cost_center';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_covenants_id_fkey';
            columns: ['covenants_id'];
            isOneToOne: false;
            referencedRelation: 'covenant';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_guild_id_fkey';
            columns: ['guild_id'];
            isOneToOne: false;
            referencedRelation: 'guild';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_hierarchical_position_fkey';
            columns: ['hierarchical_position'];
            isOneToOne: false;
            referencedRelation: 'hierarchy';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_province_fkey';
            columns: ['province'];
            isOneToOne: false;
            referencedRelation: 'provinces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_type_of_contract_fkey';
            columns: ['type_of_contract'];
            isOneToOne: false;
            referencedRelation: 'types_of_contract';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'employees_workflow_diagram_fkey';
            columns: ['workflow_diagram'];
            isOneToOne: false;
            referencedRelation: 'work_diagram';
            referencedColumns: ['id'];
          },
        ];
      };
      employees_diagram: {
        Row: {
          created_at: string;
          day: number;
          diagram_type: string;
          employee_id: string;
          id: string;
          month: number;
          year: number;
        };
        Insert: {
          created_at?: string;
          day: number;
          diagram_type?: string;
          employee_id?: string;
          id?: string;
          month: number;
          year: number;
        };
        Update: {
          created_at?: string;
          day?: number;
          diagram_type?: string;
          employee_id?: string;
          id?: string;
          month?: number;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'employees_diagram_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_employees_diagram_diagram_type_fkey';
            columns: ['diagram_type'];
            isOneToOne: false;
            referencedRelation: 'diagram_type';
            referencedColumns: ['id'];
          },
        ];
      };
      equipos_clientes: {
        Row: {
          created_at: string;
          customer_id: string;
          id: string;
          name: string;
          type: Database['public']['Enums']['type_equipment'];
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          id?: string;
          name: string;
          type: Database['public']['Enums']['type_equipment'];
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          id?: string;
          name?: string;
          type?: Database['public']['Enums']['type_equipment'];
        };
        Relationships: [
          {
            foreignKeyName: 'equipos_clientes_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      form_answers: {
        Row: {
          answer: Json;
          created_at: string;
          form_id: string;
          id: string;
        };
        Insert: {
          answer: Json;
          created_at?: string;
          form_id: string;
          id?: string;
        };
        Update: {
          answer?: Json;
          created_at?: string;
          form_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'form_answers_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'custom_form';
            referencedColumns: ['id'];
          },
        ];
      };
      guild: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'public_guild_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      handle_errors: {
        Row: {
          created_at: string;
          id: number;
          menssage: string;
          path: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          menssage: string;
          path: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          menssage?: string;
          path?: string;
        };
        Relationships: [];
      };
      hierarchy: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [];
      };
      hired_modules: {
        Row: {
          company_id: string | null;
          created_at: string;
          due_to: string | null;
          id: string;
          module_id: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          due_to?: string | null;
          id?: string;
          module_id?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          due_to?: string | null;
          id?: string;
          module_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'hired_modules_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hired_modules_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
        ];
      };
      industry_type: {
        Row: {
          created_at: string;
          id: number;
          is_active: boolean | null;
          name: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_active?: boolean | null;
          name?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_active?: boolean | null;
          name?: string | null;
        };
        Relationships: [];
      };
      measure_units: {
        Row: {
          id: number;
          simbol: string;
          tipo: string;
          unit: string;
        };
        Insert: {
          id?: number;
          simbol: string;
          tipo: string;
          unit: string;
        };
        Update: {
          id?: number;
          simbol?: string;
          tipo?: string;
          unit?: string;
        };
        Relationships: [];
      };
      model_vehicles: {
        Row: {
          brand: number | null;
          created_at: string;
          id: number;
          is_active: boolean | null;
          name: string | null;
        };
        Insert: {
          brand?: number | null;
          created_at?: string;
          id?: number;
          is_active?: boolean | null;
          name?: string | null;
        };
        Update: {
          brand?: number | null;
          created_at?: string;
          id?: number;
          is_active?: boolean | null;
          name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'public_model_vehicles_brand_fkey';
            columns: ['brand'];
            isOneToOne: false;
            referencedRelation: 'brand_vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      modules: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          name: string;
          price: number;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          name: string;
          price: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          price?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          category: Database['public']['Enums']['notification_categories'] | null;
          company_id: string | null;
          created_at: string | null;
          description: string | null;
          document_id: string | null;
          id: string;
          reference: string | null;
          title: string | null;
        };
        Insert: {
          category?: Database['public']['Enums']['notification_categories'] | null;
          company_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          document_id?: string | null;
          id?: string;
          reference?: string | null;
          title?: string | null;
        };
        Update: {
          category?: Database['public']['Enums']['notification_categories'] | null;
          company_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          document_id?: string | null;
          id?: string;
          reference?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'public_notifications_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      profile: {
        Row: {
          avatar: string | null;
          created_at: string | null;
          credential_id: string | null;
          email: string | null;
          fullname: string | null;
          id: string;
          modulos: Database['public']['Enums']['modulos'][] | null;
          role: string | null;
        };
        Insert: {
          avatar?: string | null;
          created_at?: string | null;
          credential_id?: string | null;
          email?: string | null;
          fullname?: string | null;
          id: string;
          modulos?: Database['public']['Enums']['modulos'][] | null;
          role?: string | null;
        };
        Update: {
          avatar?: string | null;
          created_at?: string | null;
          credential_id?: string | null;
          email?: string | null;
          fullname?: string | null;
          id?: string;
          modulos?: Database['public']['Enums']['modulos'][] | null;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_role_fkey';
            columns: ['role'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['name'];
          },
        ];
      };
      provinces: {
        Row: {
          created_at: string;
          id: number;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      repair_solicitudes: {
        Row: {
          created_at: string;
          employee_id: string | null;
          end_date: string | null;
          equipment_id: string;
          id: string;
          kilometer: string | null;
          mechanic_description: string | null;
          mechanic_id: string | null;
          mechanic_images: string[] | null;
          reparation_type: string;
          scheduled: string | null;
          state: Database['public']['Enums']['repair_state'];
          updated_at: string | null;
          user_description: string | null;
          user_id: string | null;
          user_images: string[] | null;
        };
        Insert: {
          created_at?: string;
          employee_id?: string | null;
          end_date?: string | null;
          equipment_id: string;
          id?: string;
          kilometer?: string | null;
          mechanic_description?: string | null;
          mechanic_id?: string | null;
          mechanic_images?: string[] | null;
          reparation_type: string;
          scheduled?: string | null;
          state: Database['public']['Enums']['repair_state'];
          updated_at?: string | null;
          user_description?: string | null;
          user_id?: string | null;
          user_images?: string[] | null;
        };
        Update: {
          created_at?: string;
          employee_id?: string | null;
          end_date?: string | null;
          equipment_id?: string;
          id?: string;
          kilometer?: string | null;
          mechanic_description?: string | null;
          mechanic_id?: string | null;
          mechanic_images?: string[] | null;
          reparation_type?: string;
          scheduled?: string | null;
          state?: Database['public']['Enums']['repair_state'];
          updated_at?: string | null;
          user_description?: string | null;
          user_id?: string | null;
          user_images?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'repair_solicitudes_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'repair_solicitudes_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'repair_solicitudes_mechanic_id_fkey';
            columns: ['mechanic_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'repair_solicitudes_reparation_type_fkey';
            columns: ['reparation_type'];
            isOneToOne: false;
            referencedRelation: 'types_of_repairs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'repair_solicitudes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      repairlogs: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          kilometer: string | null;
          modified_by_employee: string | null;
          modified_by_user: string | null;
          repair_id: string | null;
          title: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          kilometer?: string | null;
          modified_by_employee?: string | null;
          modified_by_user?: string | null;
          repair_id?: string | null;
          title?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          kilometer?: string | null;
          modified_by_employee?: string | null;
          modified_by_user?: string | null;
          repair_id?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'repairlogs_modified_by_employee_fkey';
            columns: ['modified_by_employee'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'repairlogs_modified_by_user_fkey';
            columns: ['modified_by_user'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reparirlogs_repair_id_fkey';
            columns: ['repair_id'];
            isOneToOne: false;
            referencedRelation: 'repair_solicitudes';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          id: number;
          intern: boolean | null;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          intern?: boolean | null;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          intern?: boolean | null;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [];
      };
      sector_customer: {
        Row: {
          created_at: string | null;
          customer_id: string;
          id: string;
          sector_id: string;
        };
        Insert: {
          created_at?: string | null;
          customer_id: string;
          id?: string;
          sector_id: string;
        };
        Update: {
          created_at?: string | null;
          customer_id?: string;
          id?: string;
          sector_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sector_customer_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sector_customer_sector_id_fkey';
            columns: ['sector_id'];
            isOneToOne: false;
            referencedRelation: 'sectors';
            referencedColumns: ['id'];
          },
        ];
      };
      sectors: {
        Row: {
          created_at: string | null;
          descripcion_corta: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          descripcion_corta?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          descripcion_corta?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      service_areas: {
        Row: {
          area_id: string;
          id: string;
          service_id: string;
        };
        Insert: {
          area_id: string;
          id?: string;
          service_id: string;
        };
        Update: {
          area_id?: string;
          id?: string;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_areas_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas_cliente';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_areas_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'customer_services';
            referencedColumns: ['id'];
          },
        ];
      };
      service_items: {
        Row: {
          code_item: string | null;
          company_id: string;
          created_at: string;
          customer_service_id: string;
          id: string;
          is_active: boolean | null;
          item_description: string;
          item_measure_units: number;
          item_name: string;
          item_number: string | null;
          item_price: number;
        };
        Insert: {
          code_item?: string | null;
          company_id: string;
          created_at?: string;
          customer_service_id: string;
          id?: string;
          is_active?: boolean | null;
          item_description: string;
          item_measure_units: number;
          item_name: string;
          item_number?: string | null;
          item_price: number;
        };
        Update: {
          code_item?: string | null;
          company_id?: string;
          created_at?: string;
          customer_service_id?: string;
          id?: string;
          is_active?: boolean | null;
          item_description?: string;
          item_measure_units?: number;
          item_name?: string;
          item_number?: string | null;
          item_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'public_service_items_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_service_items_item_measure_units_fkey';
            columns: ['item_measure_units'];
            isOneToOne: false;
            referencedRelation: 'measure_units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_items_customer_service_id_fkey';
            columns: ['customer_service_id'];
            isOneToOne: false;
            referencedRelation: 'customer_services';
            referencedColumns: ['id'];
          },
        ];
      };
      service_sectors: {
        Row: {
          created_at: string | null;
          id: string;
          sector_id: string;
          service_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          sector_id: string;
          service_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          sector_id?: string;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_sectors_sector_id_fkey';
            columns: ['sector_id'];
            isOneToOne: false;
            referencedRelation: 'sectors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_sectors_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'customer_services';
            referencedColumns: ['id'];
          },
        ];
      };
      share_company_users: {
        Row: {
          company_id: string | null;
          created_at: string;
          customer_id: string | null;
          id: string;
          modules: Database['public']['Enums']['modulos'][] | null;
          profile_id: string | null;
          role: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          modules?: Database['public']['Enums']['modulos'][] | null;
          profile_id?: string | null;
          role?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          modules?: Database['public']['Enums']['modulos'][] | null;
          profile_id?: string | null;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'public_share_company_users_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_share_company_users_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'share_company_users_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'share_company_users_role_fkey';
            columns: ['role'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['name'];
          },
        ];
      };
      storage_migrations: {
        Row: {
          created_at: string | null;
          document_id: string;
          error_message: string | null;
          executed_at: string | null;
          id: string;
          new_path: string;
          old_path: string;
          status: string | null;
        };
        Insert: {
          created_at?: string | null;
          document_id: string;
          error_message?: string | null;
          executed_at?: string | null;
          id?: string;
          new_path: string;
          old_path: string;
          status?: string | null;
        };
        Update: {
          created_at?: string | null;
          document_id?: string;
          error_message?: string | null;
          executed_at?: string | null;
          id?: string;
          new_path?: string;
          old_path?: string;
          status?: string | null;
        };
        Relationships: [];
      };
      sub_type: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean | null;
          name: string;
          type: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
          type?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sub_type_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sub_type_type_fkey';
            columns: ['type'];
            isOneToOne: false;
            referencedRelation: 'type';
            referencedColumns: ['id'];
          },
        ];
      };
      type: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'type_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      type_operative: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      types_of_contract: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [];
      };
      types_of_repairs: {
        Row: {
          company_id: string | null;
          created_at: string;
          criticity: string | null;
          description: string;
          id: string;
          is_active: boolean;
          multi_equipment: boolean;
          name: string;
          qr_close: boolean;
          type_of_maintenance: Database['public']['Enums']['type_of_maintenance_ENUM'] | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          criticity?: string | null;
          description: string;
          id?: string;
          is_active?: boolean;
          multi_equipment?: boolean;
          name: string;
          qr_close?: boolean;
          type_of_maintenance?: Database['public']['Enums']['type_of_maintenance_ENUM'] | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          criticity?: string | null;
          description?: string;
          id?: string;
          is_active?: boolean;
          multi_equipment?: boolean;
          name?: string;
          qr_close?: boolean;
          type_of_maintenance?: Database['public']['Enums']['type_of_maintenance_ENUM'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'types_of_repairs_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      types_of_vehicles: {
        Row: {
          created_at: string;
          id: number;
          is_active: boolean | null;
          name: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_active?: boolean | null;
          name?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_active?: boolean | null;
          name?: string | null;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          allocated_to: string[] | null;
          brand: number | null;
          chassis: string | null;
          company_id: string | null;
          condition: Database['public']['Enums']['condition_enum'] | null;
          cost_center_id: string | null;
          created_at: string;
          domain: string | null;
          engine: string;
          id: string;
          intern_number: string | null;
          is_active: boolean | null;
          kilometer: string | null;
          model: number | null;
          picture: string | null;
          reason_for_termination: Database['public']['Enums']['termination_reason_enum'] | null;
          serie: string | null;
          status: Database['public']['Enums']['status_type'] | null;
          subType: string | null;
          termination_date: string | null;
          type: string;
          type_of_vehicle: number;
          type_operative_id: string | null;
          user_id: string | null;
          year: string;
        };
        Insert: {
          allocated_to?: string[] | null;
          brand?: number | null;
          chassis?: string | null;
          company_id?: string | null;
          condition?: Database['public']['Enums']['condition_enum'] | null;
          cost_center_id?: string | null;
          created_at?: string;
          domain?: string | null;
          engine: string;
          id?: string;
          intern_number?: string | null;
          is_active?: boolean | null;
          kilometer?: string | null;
          model?: number | null;
          picture?: string | null;
          reason_for_termination?: Database['public']['Enums']['termination_reason_enum'] | null;
          serie?: string | null;
          status?: Database['public']['Enums']['status_type'] | null;
          subType?: string | null;
          termination_date?: string | null;
          type: string;
          type_of_vehicle: number;
          type_operative_id?: string | null;
          user_id?: string | null;
          year: string;
        };
        Update: {
          allocated_to?: string[] | null;
          brand?: number | null;
          chassis?: string | null;
          company_id?: string | null;
          condition?: Database['public']['Enums']['condition_enum'] | null;
          cost_center_id?: string | null;
          created_at?: string;
          domain?: string | null;
          engine?: string;
          id?: string;
          intern_number?: string | null;
          is_active?: boolean | null;
          kilometer?: string | null;
          model?: number | null;
          picture?: string | null;
          reason_for_termination?: Database['public']['Enums']['termination_reason_enum'] | null;
          serie?: string | null;
          status?: Database['public']['Enums']['status_type'] | null;
          subType?: string | null;
          termination_date?: string | null;
          type?: string;
          type_of_vehicle?: number;
          type_operative_id?: string | null;
          user_id?: string | null;
          year?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_vehicles_model_fkey';
            columns: ['model'];
            isOneToOne: false;
            referencedRelation: 'model_vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_vehicles_type_fkey';
            columns: ['type'];
            isOneToOne: false;
            referencedRelation: 'type';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_brand_fkey';
            columns: ['brand'];
            isOneToOne: false;
            referencedRelation: 'brand_vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_cost_center_id_fkey';
            columns: ['cost_center_id'];
            isOneToOne: false;
            referencedRelation: 'cost_center';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_subType_fkey';
            columns: ['subType'];
            isOneToOne: false;
            referencedRelation: 'sub_type';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_type_of_vehicle_fkey';
            columns: ['type_of_vehicle'];
            isOneToOne: false;
            referencedRelation: 'types_of_vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_type_operative_id_fkey';
            columns: ['type_operative_id'];
            isOneToOne: false;
            referencedRelation: 'type_operative';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      work_diagram: {
        Row: {
          active_working_days: number | null;
          created_at: string;
          id: string;
          inactive_novelty: string | null;
          inactive_working_days: number | null;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          active_working_days?: number | null;
          created_at?: string;
          id?: string;
          inactive_novelty?: string | null;
          inactive_working_days?: number | null;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          active_working_days?: number | null;
          created_at?: string;
          id?: string;
          inactive_novelty?: string | null;
          inactive_working_days?: number | null;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'work-diagram_inactive_novelty_fkey';
            columns: ['inactive_novelty'];
            isOneToOne: false;
            referencedRelation: 'diagram_type';
            referencedColumns: ['id'];
          },
        ];
      };
      work_diagram_active_novelties: {
        Row: {
          created_at: string;
          diagram_type_id: string;
          id: string;
          work_diagram_id: string;
        };
        Insert: {
          created_at?: string;
          diagram_type_id: string;
          id?: string;
          work_diagram_id: string;
        };
        Update: {
          created_at?: string;
          diagram_type_id?: string;
          id?: string;
          work_diagram_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'work_diagram_active_novelties_diagram_type_id_fkey';
            columns: ['diagram_type_id'];
            isOneToOne: false;
            referencedRelation: 'diagram_type';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_diagram_active_novelties_work_diagram_id_fkey';
            columns: ['work_diagram_id'];
            isOneToOne: false;
            referencedRelation: 'work_diagram';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      actualizar_estado_daily_reports: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      actualizar_estado_documentos: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      build_employee_where: {
        Args: { _conditions: Json };
        Returns: string;
      };
      build_employee_where_alias: {
        Args: { _conditions: Json; table_alias: string };
        Returns: string;
      };
      build_vehicle_where: {
        Args: { _conditions: Json };
        Returns: string;
      };
      build_vehicle_where_alias: {
        Args: { _conditions: Json; table_alias?: string };
        Returns: string;
      };
      build_vehicle_where_alias_in_review: {
        Args: { _conditions: Json; table_alias?: string; user_id?: string };
        Returns: string;
      };
      check_diagram_conflicts_with_operations: {
        Args:
          | { p_employee_ids: string[]; p_date_from: string; p_date_to: string }
          | {
              p_employee_ids: string[];
              p_diagram_type_id: string;
              p_date_from: string;
              p_date_to: string;
            };
        Returns: {
          employee_id: string;
          employee_name: string;
          day: number;
          month: number;
          year: number;
          date_formatted: string;
          current_diagram_type: string;
          current_diagram_name: string;
          current_diagram_color: string;
          is_used_in_operations: boolean;
          operation_details: string;
          can_update: boolean;
          conflict_type: string;
        }[];
      };
      check_diagram_conflicts_with_operations_v2: {
        Args:
          | {
              p_employee_ids: string[];
              p_work_diagram_id: string;
              p_date_from: string;
              p_date_to: string;
            }
          | {
              p_employee_ids: string[];
              p_work_diagram_id: string;
              p_date_from: string;
              p_date_to: string;
              p_active_novelty_id: string;
            };
        Returns: Json;
      };
      controlar_alertas_documentos: {
        Args: { tipo_documento_id?: string };
        Returns: undefined;
      };
      create_massive_diagrams_with_validations: {
        Args: {
          p_employee_ids: string[];
          p_diagram_type_id: string;
          p_date_from: string;
          p_date_to: string;
        };
        Returns: Json;
      };
      delete_expired_subscriptions: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      enviar_documentos_a_46_dias: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      enviar_documentos_vencidos: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      find_employee_by_full_name_v2: {
        Args: { p_full_name: string; p_company_id: string };
        Returns: {
          affiliate_status: Database['public']['Enums']['affiliate_status_enum'] | null;
          allocated_to: string[] | null;
          birthplace: string;
          born_date: string | null;
          category_id: string | null;
          city: number | null;
          company_id: string | null;
          company_position: string | null;
          cost_center_id: string | null;
          covenants_id: string | null;
          created_at: string;
          cuil: string;
          date_of_admission: string;
          document_number: string;
          document_type: Database['public']['Enums']['document_type_enum'] | null;
          email: string | null;
          file: string;
          firstname: string;
          gender: Database['public']['Enums']['gender_enum'] | null;
          guild_id: string | null;
          hierarchical_position: string | null;
          id: string;
          is_active: boolean | null;
          lastname: string;
          level_of_education: Database['public']['Enums']['level_of_education_enum'] | null;
          marital_status: Database['public']['Enums']['marital_status_enum'] | null;
          nationality: Database['public']['Enums']['nationality_enum'] | null;
          normal_hours: string | null;
          phone: string;
          picture: string | null;
          postal_code: string | null;
          province: number;
          reason_for_termination: Database['public']['Enums']['reason_for_termination_enum'] | null;
          status: Database['public']['Enums']['status_type'] | null;
          street: string;
          street_number: string;
          termination_date: string | null;
          type_of_contract: string | null;
          workflow_diagram: string | null;
        }[];
      };
      get_dailyreportrow_history: {
        Args: { p_row_id: string };
        Returns: {
          id: string;
          action_type: string;
          changed_fields: Json;
          changed_data: Json;
          changed_by: Json;
          created_at: string;
          related_table: string;
          related_id: string;
          metadata: Json;
          reassignment_reason: string;
        }[];
      };
      get_employee_diagram_count_by_day: {
        Args: {
          p_day: number;
          p_month: number;
          p_year: number;
          p_company_position_ids?: string[];
        };
        Returns: Json;
      };
      get_employee_usage_by_positions: {
        Args: { position_uuids: string[] };
        Returns: {
          employees_operativos: number;
          employees_used: number;
          indicator: number;
        }[];
      };
      get_employee_usage_indicator: {
        Args: { save_to_table?: boolean; position_uuids?: string[] };
        Returns: {
          employees_operativos: number;
          employees_used: number;
          indicator: number;
        }[];
      };
      get_vehicle_usage_indicator: {
        Args: { p_vehicle_type_ids: string[] } | { p_vehicle_types: string[] };
        Returns: {
          type: string;
          available_units: number;
          used_units: number;
          usage_indicator: number;
        }[];
      };
      migrate_document: {
        Args: { target_id: string; execute_migration?: boolean };
        Returns: {
          old_path: string;
          new_path: string;
          success: boolean;
          error_message: string;
          action_taken: string;
          storage_migration_id: string;
        }[];
      };
      migrate_documents_preview: {
        Args: Record<PropertyKey, never>;
        Returns: {
          old_path: string;
          new_path: string;
          success: boolean;
          error_message: string;
        }[];
      };
      obtener_documentos_por_vencer: {
        Args: Record<PropertyKey, never>;
        Returns: {
          tipo_documento: string;
          correo_electronico: string;
          fecha_vencimiento: string;
          documento_empleado: string;
          dominio_vehiculo: string;
        }[];
      };
      process_massive_diagram_creation_v2: {
        Args: {
          p_employee_ids: string[];
          p_work_diagram_id: string;
          p_active_novelty_id: string;
          p_date_from: string;
          p_date_to: string;
          p_conflict_resolution: string;
        };
        Returns: Json;
      };
      pruebaemail: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      select_distinct_values: {
        Args: {
          p_table_name: string;
          p_column_path: string;
          p_join_mappings?: Json;
          p_multi_join_paths?: Json;
          p_filters?: Json;
        };
        Returns: {
          col_value: string;
          col_count: number;
        }[];
      };
      set_reassignment_reason: {
        Args: { reason: string };
        Returns: undefined;
      };
      verificar_documentos_vencidos_prueba: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      affiliate_status_enum: 'Dentro de convenio' | 'Fuera de convenio';
      condition_enum: 'operativo' | 'no operativo' | 'en reparacion' | 'operativo condicionado';
      daily_report_header_status_new: 'abierto' | 'cerrado' | 'cerrado_completo' | 'cerrado_incompleto';
      daily_report_status:
        | 'pendiente'
        | 'sin_recursos_asignados'
        | 'ejecutado'
        | 'reprogramado'
        | 'cancelado'
        | '.'
        | '..';
      daily_report_type_enum: 'mensual' | 'adicional' | 'adicional_permanente';
      document_applies: 'Persona' | 'Equipos' | 'Empresa';
      document_type_enum: 'DNI' | 'LE' | 'LC' | 'PASAPORTE';
      gender_enum: 'Masculino' | 'Femenino' | 'No Declarado';
      level_of_education_enum: 'Primario' | 'Secundario' | 'Terciario' | 'Universitario' | 'PosGrado';
      marital_status_enum: 'Casado' | 'Soltero' | 'Divorciado' | 'Viudo' | 'Separado' | 'Union de hecho';
      modulos:
        | 'empresa'
        | 'empleados'
        | 'equipos'
        | 'documentación'
        | 'mantenimiento'
        | 'dashboard'
        | 'ayuda'
        | 'operaciones'
        | 'formularios';
      nationality_enum: 'Argentina' | 'Extranjero';
      notification_categories: 'vencimiento' | 'noticia' | 'advertencia' | 'aprobado' | 'rechazado';
      reason_for_termination_enum:
        | 'Despido sin causa'
        | 'Renuncia'
        | 'Despido con causa'
        | 'Acuerdo de partes'
        | 'Fin de contrato'
        | 'Fallecimiento';
      repair_state:
        | 'Pendiente'
        | 'Esperando repuestos'
        | 'En reparación'
        | 'Finalizado'
        | 'Rechazado'
        | 'Cancelado'
        | 'Programado';
      roles_enum: 'Externo' | 'Auditor';
      state: 'presentado' | 'rechazado' | 'aprobado' | 'vencido' | 'pendiente';
      status_type: 'Avalado' | 'No avalado' | 'Incompleto' | 'Completo' | 'Completo con doc vencida';
      termination_reason_enum: 'venta' | 'destrucción total' | 'devolución' | 'otro';
      type_equipment: 'Perforador' | 'Perforador Spudder' | 'Work over' | 'Fractura' | 'Coiled Tubing';
      type_of_contract_enum: 'Período de prueba' | 'A tiempo indeterminado' | 'Plazo fijo';
      type_of_maintenance_ENUM: 'Correctivo' | 'Preventivo' | 'Otro';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      affiliate_status_enum: ['Dentro de convenio', 'Fuera de convenio'],
      condition_enum: ['operativo', 'no operativo', 'en reparacion', 'operativo condicionado'],
      daily_report_header_status_new: ['abierto', 'cerrado', 'cerrado_completo', 'cerrado_incompleto'],
      daily_report_status: ['pendiente', 'sin_recursos_asignados', 'ejecutado', 'reprogramado', 'cancelado', '.', '..'],
      daily_report_type_enum: ['mensual', 'adicional', 'adicional_permanente'],
      document_applies: ['Persona', 'Equipos', 'Empresa'],
      document_type_enum: ['DNI', 'LE', 'LC', 'PASAPORTE'],
      gender_enum: ['Masculino', 'Femenino', 'No Declarado'],
      level_of_education_enum: ['Primario', 'Secundario', 'Terciario', 'Universitario', 'PosGrado'],
      marital_status_enum: ['Casado', 'Soltero', 'Divorciado', 'Viudo', 'Separado', 'Union de hecho'],
      modulos: [
        'empresa',
        'empleados',
        'equipos',
        'documentación',
        'mantenimiento',
        'dashboard',
        'ayuda',
        'operaciones',
        'formularios',
      ],
      nationality_enum: ['Argentina', 'Extranjero'],
      notification_categories: ['vencimiento', 'noticia', 'advertencia', 'aprobado', 'rechazado'],
      reason_for_termination_enum: [
        'Despido sin causa',
        'Renuncia',
        'Despido con causa',
        'Acuerdo de partes',
        'Fin de contrato',
        'Fallecimiento',
      ],
      repair_state: [
        'Pendiente',
        'Esperando repuestos',
        'En reparación',
        'Finalizado',
        'Rechazado',
        'Cancelado',
        'Programado',
      ],
      roles_enum: ['Externo', 'Auditor'],
      state: ['presentado', 'rechazado', 'aprobado', 'vencido', 'pendiente'],
      status_type: ['Avalado', 'No avalado', 'Incompleto', 'Completo', 'Completo con doc vencida'],
      termination_reason_enum: ['venta', 'destrucción total', 'devolución', 'otro'],
      type_equipment: ['Perforador', 'Perforador Spudder', 'Work over', 'Fractura', 'Coiled Tubing'],
      type_of_contract_enum: ['Período de prueba', 'A tiempo indeterminado', 'Plazo fijo'],
      type_of_maintenance_ENUM: ['Correctivo', 'Preventivo', 'Otro'],
    },
  },
} as const;
