export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number;
          checksum: string;
          finished_at: string | null;
          id: string;
          logs: string | null;
          migration_name: string;
          rolled_back_at: string | null;
          started_at: string;
        };
        Insert: {
          applied_steps_count?: number;
          checksum: string;
          finished_at?: string | null;
          id: string;
          logs?: string | null;
          migration_name: string;
          rolled_back_at?: string | null;
          started_at?: string;
        };
        Update: {
          applied_steps_count?: number;
          checksum?: string;
          finished_at?: string | null;
          id?: string;
          logs?: string | null;
          migration_name?: string;
          rolled_back_at?: string | null;
          started_at?: string;
        };
        Relationships: [];
      };
      actions: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
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
            referencedRelation: 'equipments_with_pending_deviations';
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
      checklist_answer_repairs: {
        Row: {
          checklist_answer_id: string;
          created_at: string | null;
          id: string;
          item_code: string;
          repair_solicitud_id: string;
        };
        Insert: {
          checklist_answer_id: string;
          created_at?: string | null;
          id?: string;
          item_code: string;
          repair_solicitud_id: string;
        };
        Update: {
          checklist_answer_id?: string;
          created_at?: string | null;
          id?: string;
          item_code?: string;
          repair_solicitud_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_answer_repairs_checklist_answer_id_fkey';
            columns: ['checklist_answer_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_answers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_answer_repairs_repair_solicitud_id_fkey';
            columns: ['repair_solicitud_id'];
            isOneToOne: false;
            referencedRelation: 'repair_solicitudes';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_answers: {
        Row: {
          answer_data: Json;
          chofer_employee_id: string | null;
          created_at: string | null;
          critical_items_failed: string[] | null;
          customer_id: string | null;
          employee_id: string | null;
          equipment_id: string;
          horometro: number | null;
          id: string;
          kilometraje: number | null;
          observations: string | null;
          result: string | null;
          template_id: string;
          updated_at: string | null;
          user_id: string | null;
          ut_checklist_answer_id: string | null;
        };
        Insert: {
          answer_data: Json;
          chofer_employee_id?: string | null;
          created_at?: string | null;
          critical_items_failed?: string[] | null;
          customer_id?: string | null;
          employee_id?: string | null;
          equipment_id: string;
          horometro?: number | null;
          id?: string;
          kilometraje?: number | null;
          observations?: string | null;
          result?: string | null;
          template_id: string;
          updated_at?: string | null;
          user_id?: string | null;
          ut_checklist_answer_id?: string | null;
        };
        Update: {
          answer_data?: Json;
          chofer_employee_id?: string | null;
          created_at?: string | null;
          critical_items_failed?: string[] | null;
          customer_id?: string | null;
          employee_id?: string | null;
          equipment_id?: string;
          horometro?: number | null;
          id?: string;
          kilometraje?: number | null;
          observations?: string | null;
          result?: string | null;
          template_id?: string;
          updated_at?: string | null;
          user_id?: string | null;
          ut_checklist_answer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_answers_chofer_employee_id_fkey';
            columns: ['chofer_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_answers_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_answers_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'equipments_with_pending_deviations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_answers_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_answers_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_answers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_answers_ut_checklist_answer_id_fkey';
            columns: ['ut_checklist_answer_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_answers';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_deviations: {
        Row: {
          checklist_answer_id: string | null;
          created_at: string | null;
          created_by_employee_id: string | null;
          created_by_user_id: string | null;
          driver_comment: string | null;
          equipment_id: string;
          id: string;
          is_critical: boolean | null;
          item_code: string;
          item_label: string;
          section_code: string | null;
        };
        Insert: {
          checklist_answer_id?: string | null;
          created_at?: string | null;
          created_by_employee_id?: string | null;
          created_by_user_id?: string | null;
          driver_comment?: string | null;
          equipment_id: string;
          id?: string;
          is_critical?: boolean | null;
          item_code: string;
          item_label: string;
          section_code?: string | null;
        };
        Update: {
          checklist_answer_id?: string | null;
          created_at?: string | null;
          created_by_employee_id?: string | null;
          created_by_user_id?: string | null;
          driver_comment?: string | null;
          equipment_id?: string;
          id?: string;
          is_critical?: boolean | null;
          item_code?: string;
          item_label?: string;
          section_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_deviations_checklist_answer_id_fkey';
            columns: ['checklist_answer_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_answers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_deviations_created_by_employee_id_fkey';
            columns: ['created_by_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_deviations_created_by_user_id_fkey';
            columns: ['created_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_deviations_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'equipments_with_pending_deviations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_deviations_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_items: {
        Row: {
          certification_validity_days: number | null;
          code: string;
          created_at: string | null;
          default_value: string | null;
          description: string | null;
          id: string;
          input_type: string;
          is_critical: boolean | null;
          label: string;
          options: Json | null;
          order_index: number | null;
          requires_certification: boolean | null;
          requires_side_validation: boolean | null;
          section_id: string;
          updated_at: string | null;
          validation_rules: Json | null;
        };
        Insert: {
          certification_validity_days?: number | null;
          code: string;
          created_at?: string | null;
          default_value?: string | null;
          description?: string | null;
          id?: string;
          input_type: string;
          is_critical?: boolean | null;
          label: string;
          options?: Json | null;
          order_index?: number | null;
          requires_certification?: boolean | null;
          requires_side_validation?: boolean | null;
          section_id: string;
          updated_at?: string | null;
          validation_rules?: Json | null;
        };
        Update: {
          certification_validity_days?: number | null;
          code?: string;
          created_at?: string | null;
          default_value?: string | null;
          description?: string | null;
          id?: string;
          input_type?: string;
          is_critical?: boolean | null;
          label?: string;
          options?: Json | null;
          order_index?: number | null;
          requires_certification?: boolean | null;
          requires_side_validation?: boolean | null;
          section_id?: string;
          updated_at?: string | null;
          validation_rules?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_items_section_id_fkey';
            columns: ['section_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_sections';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_sections: {
        Row: {
          code: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_reusable: boolean | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_reusable?: boolean | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_reusable?: boolean | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      checklist_template_items: {
        Row: {
          certification_validity_days: number | null;
          code: string;
          created_at: string | null;
          description: string | null;
          id: string;
          input_type: string;
          is_critical: boolean | null;
          item_id: string | null;
          label: string;
          options: Json | null;
          order_index: number;
          requires_certification: boolean | null;
          requires_side_validation: boolean | null;
          section_id: string;
          template_id: string;
          updated_at: string | null;
          validation_rules: Json | null;
        };
        Insert: {
          certification_validity_days?: number | null;
          code: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          input_type: string;
          is_critical?: boolean | null;
          item_id?: string | null;
          label: string;
          options?: Json | null;
          order_index: number;
          requires_certification?: boolean | null;
          requires_side_validation?: boolean | null;
          section_id: string;
          template_id: string;
          updated_at?: string | null;
          validation_rules?: Json | null;
        };
        Update: {
          certification_validity_days?: number | null;
          code?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          input_type?: string;
          is_critical?: boolean | null;
          item_id?: string | null;
          label?: string;
          options?: Json | null;
          order_index?: number;
          requires_certification?: boolean | null;
          requires_side_validation?: boolean | null;
          section_id?: string;
          template_id?: string;
          updated_at?: string | null;
          validation_rules?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_template_items_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_template_items_section_id_fkey';
            columns: ['section_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_template_sections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_template_items_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_template_sections: {
        Row: {
          code: string;
          created_at: string | null;
          id: string;
          is_required: boolean | null;
          is_specific: boolean | null;
          name: string;
          order_index: number;
          section_id: string | null;
          template_id: string;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          id?: string;
          is_required?: boolean | null;
          is_specific?: boolean | null;
          name: string;
          order_index: number;
          section_id?: string | null;
          template_id: string;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          id?: string;
          is_required?: boolean | null;
          is_specific?: boolean | null;
          name?: string;
          order_index?: number;
          section_id?: string | null;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_template_sections_section_id_fkey';
            columns: ['section_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_sections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_template_sections_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_template_sub_types: {
        Row: {
          created_at: string | null;
          id: string;
          sub_type_id: string | null;
          template_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          sub_type_id?: string | null;
          template_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          sub_type_id?: string | null;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_template_sub_types_sub_type_id_fkey';
            columns: ['sub_type_id'];
            isOneToOne: false;
            referencedRelation: 'sub_type';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_template_sub_types_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_template_types: {
        Row: {
          created_at: string | null;
          id: string;
          template_id: string;
          type_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          template_id: string;
          type_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          template_id?: string;
          type_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_template_types_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_template_types_type_id_fkey';
            columns: ['type_id'];
            isOneToOne: false;
            referencedRelation: 'type';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_templates: {
        Row: {
          code: string;
          company_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          code: string;
          company_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          company_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_templates_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
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
            referencedRelation: 'equipments_with_pending_deviations';
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
      contractor_other_equipment: {
        Row: {
          contractor_id: string;
          equipment_id: string;
          id: string;
        };
        Insert: {
          contractor_id: string;
          equipment_id: string;
          id?: string;
        };
        Update: {
          contractor_id?: string;
          equipment_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contractor_other_equipment_contractor_id_fkey';
            columns: ['contractor_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contractor_other_equipment_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'other_equipment';
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
      daily_indicators: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          metrics: Json;
          snapshot_date: string;
          source: Database['public']['Enums']['indicator_function'];
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          metrics?: Json;
          snapshot_date: string;
          source: Database['public']['Enums']['indicator_function'];
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          metrics?: Json;
          snapshot_date?: string;
          source?: Database['public']['Enums']['indicator_function'];
        };
        Relationships: [
          {
            foreignKeyName: 'kpi_daily_indicators_company_id_fkey';
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
          role: Database['public']['Enums']['employee_daily_report_role'] | null;
        };
        Insert: {
          created_at?: string | null;
          daily_report_row_id?: string | null;
          employee_id?: string | null;
          id?: string;
          role?: Database['public']['Enums']['employee_daily_report_role'] | null;
        };
        Update: {
          created_at?: string | null;
          daily_report_row_id?: string | null;
          employee_id?: string | null;
          id?: string;
          role?: Database['public']['Enums']['employee_daily_report_role'] | null;
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
          other_equipment_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          daily_report_row_id?: string | null;
          equipment_id?: string | null;
          id?: string;
          other_equipment_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          daily_report_row_id?: string | null;
          equipment_id?: string | null;
          id?: string;
          other_equipment_id?: string | null;
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
            referencedRelation: 'equipments_with_pending_deviations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dailyreportequipmentrelations_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dailyreportequipmentrelations_other_equipment_id_fkey';
            columns: ['other_equipment_id'];
            isOneToOne: false;
            referencedRelation: 'other_equipment';
            referencedColumns: ['id'];
          },
        ];
      };
      dailyreportrows: {
        Row: {
          areas_service_id: string | null;
          cancel_reason: string | null;
          completed_day: boolean | null;
          completed_night: boolean | null;
          created_at: string | null;
          customer_id: string | null;
          daily_report_id: string | null;
          description: string | null;
          document_path: string | null;
          end_time: string | null;
          id: string;
          item_id: string | null;
          last_comercial_edit_at: string | null;
          preparte_id: string | null;
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
          completed_day?: boolean | null;
          completed_night?: boolean | null;
          created_at?: string | null;
          customer_id?: string | null;
          daily_report_id?: string | null;
          description?: string | null;
          document_path?: string | null;
          end_time?: string | null;
          id?: string;
          item_id?: string | null;
          last_comercial_edit_at?: string | null;
          preparte_id?: string | null;
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
          completed_day?: boolean | null;
          completed_night?: boolean | null;
          created_at?: string | null;
          customer_id?: string | null;
          daily_report_id?: string | null;
          description?: string | null;
          document_path?: string | null;
          end_time?: string | null;
          id?: string;
          item_id?: string | null;
          last_comercial_edit_at?: string | null;
          preparte_id?: string | null;
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
            foreignKeyName: 'dailyreportrows_preparte_id_fkey';
            columns: ['preparte_id'];
            isOneToOne: true;
            referencedRelation: 'preparte';
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
          computes_absenteeism: boolean;
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
          computes_absenteeism?: boolean;
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
          computes_absenteeism?: boolean;
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
          equipment_type: string | null;
          explired: boolean;
          has_policy_number: boolean | null;
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
          equipment_type?: string | null;
          explired: boolean;
          has_policy_number?: boolean | null;
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
          equipment_type?: string | null;
          explired?: boolean;
          has_policy_number?: boolean | null;
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
          policy_number: string | null;
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
          policy_number?: string | null;
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
          policy_number?: string | null;
          state?: Database['public']['Enums']['state'] | null;
          user_id?: string | null;
          validity?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_equipment_applies_fkey';
            columns: ['applies'];
            isOneToOne: false;
            referencedRelation: 'equipments_with_pending_deviations';
            referencedColumns: ['id'];
          },
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
          cost_type: Database['public']['Enums']['cost_type_enum'] | null;
          covenants_id: string | null;
          created_at: string;
          cuil: string;
          date_of_admission: string;
          document_number: string;
          document_type: Database['public']['Enums']['document_type_enum'] | null;
          email: string | null;
          file: string;
          firstname: string;
          full_name: string | null;
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
          workshop_sector_id: string | null;
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
          cost_type?: Database['public']['Enums']['cost_type_enum'] | null;
          covenants_id?: string | null;
          created_at?: string;
          cuil: string;
          date_of_admission: string;
          document_number: string;
          document_type?: Database['public']['Enums']['document_type_enum'] | null;
          email?: string | null;
          file: string;
          firstname: string;
          full_name?: string | null;
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
          workshop_sector_id?: string | null;
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
          cost_type?: Database['public']['Enums']['cost_type_enum'] | null;
          covenants_id?: string | null;
          created_at?: string;
          cuil?: string;
          date_of_admission?: string;
          document_number?: string;
          document_type?: Database['public']['Enums']['document_type_enum'] | null;
          email?: string | null;
          file?: string;
          firstname?: string;
          full_name?: string | null;
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
          workshop_sector_id?: string | null;
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
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_workflow_diagram_fkey';
            columns: ['workflow_diagram'];
            isOneToOne: false;
            referencedRelation: 'work_diagram';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_workshop_sector_id_fkey';
            columns: ['workshop_sector_id'];
            isOneToOne: false;
            referencedRelation: 'workshop_sectors';
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
          is_active: boolean | null;
          month: number;
          year: number;
        };
        Insert: {
          created_at?: string;
          day: number;
          diagram_type?: string;
          employee_id?: string;
          id?: string;
          is_active?: boolean | null;
          month: number;
          year: number;
        };
        Update: {
          created_at?: string;
          day?: number;
          diagram_type?: string;
          employee_id?: string;
          id?: string;
          is_active?: boolean | null;
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
      equipment_owner_contract_types: {
        Row: {
          contract_type: Database['public']['Enums']['contract_type_enum'];
          created_at: string | null;
          equipment_owner_id: string;
          id: string;
        };
        Insert: {
          contract_type: Database['public']['Enums']['contract_type_enum'];
          created_at?: string | null;
          equipment_owner_id: string;
          id?: string;
        };
        Update: {
          contract_type?: Database['public']['Enums']['contract_type_enum'];
          created_at?: string | null;
          equipment_owner_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'equipment_owner_contract_types_equipment_owner_id_fkey';
            columns: ['equipment_owner_id'];
            isOneToOne: false;
            referencedRelation: 'equipment_owners';
            referencedColumns: ['id'];
          },
        ];
      };
      equipment_owners: {
        Row: {
          company_id: string | null;
          contract_type: Database['public']['Enums']['contract_type_enum'];
          created_at: string | null;
          cuit: string;
          id: string;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          company_id?: string | null;
          contract_type: Database['public']['Enums']['contract_type_enum'];
          created_at?: string | null;
          cuit: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          company_id?: string | null;
          contract_type?: Database['public']['Enums']['contract_type_enum'];
          created_at?: string | null;
          cuit?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'equipment_owners_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
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
      kpi_revisions: {
        Row: {
          change_reason: string | null;
          changed_by: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          kpi_id: string;
          new_number: string | null;
          new_validity_date: string | null;
          previous_number: string | null;
          previous_validity_date: string | null;
        };
        Insert: {
          change_reason?: string | null;
          changed_by: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          kpi_id: string;
          new_number?: string | null;
          new_validity_date?: string | null;
          previous_number?: string | null;
          previous_validity_date?: string | null;
        };
        Update: {
          change_reason?: string | null;
          changed_by?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          kpi_id?: string;
          new_number?: string | null;
          new_validity_date?: string | null;
          previous_number?: string | null;
          previous_validity_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'kpi_revisions_kpi_id_fkey';
            columns: ['kpi_id'];
            isOneToOne: false;
            referencedRelation: 'kpis';
            referencedColumns: ['id'];
          },
        ];
      };
      kpis: {
        Row: {
          calculation_formula: string;
          code: string;
          company_id: string;
          created_at: string | null;
          filters: Json | null;
          id: string;
          improvement_opportunities: string | null;
          is_active: boolean | null;
          name: string;
          number: string | null;
          technical_support: boolean | null;
          updated_at: string | null;
          validity_date: string;
        };
        Insert: {
          calculation_formula: string;
          code: string;
          company_id: string;
          created_at?: string | null;
          filters?: Json | null;
          id?: string;
          improvement_opportunities?: string | null;
          is_active?: boolean | null;
          name: string;
          number?: string | null;
          technical_support?: boolean | null;
          updated_at?: string | null;
          validity_date: string;
        };
        Update: {
          calculation_formula?: string;
          code?: string;
          company_id?: string;
          created_at?: string | null;
          filters?: Json | null;
          id?: string;
          improvement_opportunities?: string | null;
          is_active?: boolean | null;
          name?: string;
          number?: string | null;
          technical_support?: boolean | null;
          updated_at?: string | null;
          validity_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'kpis_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_activity_log: {
        Row: {
          action_type: string;
          created_at: string;
          id: string;
          maintenance_order_id: string | null;
          maintenance_request_id: string | null;
          metadata: Json | null;
          new_status: string | null;
          notes: string | null;
          performed_at: string;
          performed_by: string | null;
          previous_status: string | null;
          rejection_reason: string | null;
          work_order_id: string | null;
        };
        Insert: {
          action_type: string;
          created_at?: string;
          id?: string;
          maintenance_order_id?: string | null;
          maintenance_request_id?: string | null;
          metadata?: Json | null;
          new_status?: string | null;
          notes?: string | null;
          performed_at?: string;
          performed_by?: string | null;
          previous_status?: string | null;
          rejection_reason?: string | null;
          work_order_id?: string | null;
        };
        Update: {
          action_type?: string;
          created_at?: string;
          id?: string;
          maintenance_order_id?: string | null;
          maintenance_request_id?: string | null;
          metadata?: Json | null;
          new_status?: string | null;
          notes?: string | null;
          performed_at?: string;
          performed_by?: string | null;
          previous_status?: string | null;
          rejection_reason?: string | null;
          work_order_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_activity_log_maintenance_order_id_fkey';
            columns: ['maintenance_order_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_activity_log_maintenance_request_id_fkey';
            columns: ['maintenance_request_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_activity_log_performed_by_fkey';
            columns: ['performed_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_activity_log_work_order_id_fkey';
            columns: ['work_order_id'];
            isOneToOne: false;
            referencedRelation: 'work_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_group_type_of_repairs: {
        Row: {
          created_at: string;
          group_id: string | null;
          id: string;
          type_id: string;
        };
        Insert: {
          created_at?: string;
          group_id?: string | null;
          id?: string;
          type_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string | null;
          id?: string;
          type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_group_type_of_repairs_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_request_groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_group_type_of_repairs_type_id_fkey';
            columns: ['type_id'];
            isOneToOne: false;
            referencedRelation: 'types_of_repairs';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_order_item_repair_types: {
        Row: {
          created_at: string | null;
          id: string;
          maintenance_order_item_id: string;
          repair_type_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          maintenance_order_item_id: string;
          repair_type_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          maintenance_order_item_id?: string;
          repair_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_order_item_repair_ty_maintenance_order_item_id_fkey';
            columns: ['maintenance_order_item_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_order_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_order_item_repair_types_repair_type_id_fkey';
            columns: ['repair_type_id'];
            isOneToOne: false;
            referencedRelation: 'types_of_repairs';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_order_items: {
        Row: {
          assigned_at: string | null;
          assigned_by: string | null;
          assigned_sector_id: string | null;
          assigned_workshop_id: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          images: string[] | null;
          is_critical: boolean | null;
          is_diagnostico: boolean;
          is_rejected: boolean;
          maintenance_order_id: string;
          maintenance_request_item_id: string | null;
          planned_end_date: string | null;
          planned_start_date: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          repair_type_id: string | null;
          sector_sequence_order: number | null;
          work_order_id: string | null;
          workshop_chief_comment: string | null;
          workshop_chief_comment_by: string | null;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_by?: string | null;
          assigned_sector_id?: string | null;
          assigned_workshop_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          images?: string[] | null;
          is_critical?: boolean | null;
          is_diagnostico?: boolean;
          is_rejected?: boolean;
          maintenance_order_id: string;
          maintenance_request_item_id?: string | null;
          planned_end_date?: string | null;
          planned_start_date?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          repair_type_id?: string | null;
          sector_sequence_order?: number | null;
          work_order_id?: string | null;
          workshop_chief_comment?: string | null;
          workshop_chief_comment_by?: string | null;
        };
        Update: {
          assigned_at?: string | null;
          assigned_by?: string | null;
          assigned_sector_id?: string | null;
          assigned_workshop_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          images?: string[] | null;
          is_critical?: boolean | null;
          is_diagnostico?: boolean;
          is_rejected?: boolean;
          maintenance_order_id?: string;
          maintenance_request_item_id?: string | null;
          planned_end_date?: string | null;
          planned_start_date?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          repair_type_id?: string | null;
          sector_sequence_order?: number | null;
          work_order_id?: string | null;
          workshop_chief_comment?: string | null;
          workshop_chief_comment_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_order_items_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_order_items_assigned_sector_id_fkey';
            columns: ['assigned_sector_id'];
            isOneToOne: false;
            referencedRelation: 'workshop_sectors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_order_items_assigned_workshop_id_fkey';
            columns: ['assigned_workshop_id'];
            isOneToOne: false;
            referencedRelation: 'workshops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_order_items_maintenance_order_id_fkey';
            columns: ['maintenance_order_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_order_items_maintenance_request_item_id_fkey';
            columns: ['maintenance_request_item_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_request_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_order_items_rejected_by_fkey';
            columns: ['rejected_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_order_items_repair_type_id_fkey';
            columns: ['repair_type_id'];
            isOneToOne: false;
            referencedRelation: 'types_of_repairs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_order_items_work_order_id_fkey';
            columns: ['work_order_id'];
            isOneToOne: false;
            referencedRelation: 'work_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_order_items_workshop_chief_comment_by_fkey';
            columns: ['workshop_chief_comment_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_orders: {
        Row: {
          created_at: string | null;
          date_approved_at: string | null;
          date_approved_by: string | null;
          date_rejected_at: string | null;
          date_rejected_by: string | null;
          date_rejection_reason: string | null;
          engine_hours_at_entry: string | null;
          equipment_id: string;
          id: string;
          kilometer_at_entry: string | null;
          maintenance_request_id: string | null;
          operations_validated_at: string | null;
          operations_validated_by: string | null;
          operations_validation_notes: string | null;
          order_number: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          scheduled_at: string | null;
          scheduled_by: string | null;
          scheduled_date: string | null;
          source: string | null;
          status: string;
          updated_at: string | null;
          workshop_approved_by: string | null;
          workshop_entry_date: string | null;
          workshop_validated_at: string | null;
          workshop_validation_notes: string | null;
        };
        Insert: {
          created_at?: string | null;
          date_approved_at?: string | null;
          date_approved_by?: string | null;
          date_rejected_at?: string | null;
          date_rejected_by?: string | null;
          date_rejection_reason?: string | null;
          engine_hours_at_entry?: string | null;
          equipment_id: string;
          id?: string;
          kilometer_at_entry?: string | null;
          maintenance_request_id?: string | null;
          operations_validated_at?: string | null;
          operations_validated_by?: string | null;
          operations_validation_notes?: string | null;
          order_number?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          scheduled_at?: string | null;
          scheduled_by?: string | null;
          scheduled_date?: string | null;
          source?: string | null;
          status?: string;
          updated_at?: string | null;
          workshop_approved_by?: string | null;
          workshop_entry_date?: string | null;
          workshop_validated_at?: string | null;
          workshop_validation_notes?: string | null;
        };
        Update: {
          created_at?: string | null;
          date_approved_at?: string | null;
          date_approved_by?: string | null;
          date_rejected_at?: string | null;
          date_rejected_by?: string | null;
          date_rejection_reason?: string | null;
          engine_hours_at_entry?: string | null;
          equipment_id?: string;
          id?: string;
          kilometer_at_entry?: string | null;
          maintenance_request_id?: string | null;
          operations_validated_at?: string | null;
          operations_validated_by?: string | null;
          operations_validation_notes?: string | null;
          order_number?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          scheduled_at?: string | null;
          scheduled_by?: string | null;
          scheduled_date?: string | null;
          source?: string | null;
          status?: string;
          updated_at?: string | null;
          workshop_approved_by?: string | null;
          workshop_entry_date?: string | null;
          workshop_validated_at?: string | null;
          workshop_validation_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_orders_date_approved_by_fkey';
            columns: ['date_approved_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_orders_date_rejected_by_fkey';
            columns: ['date_rejected_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_orders_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'equipments_with_pending_deviations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_orders_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_orders_maintenance_request_id_fkey';
            columns: ['maintenance_request_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_orders_rejected_by_fkey';
            columns: ['rejected_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_orders_scheduled_by_fkey';
            columns: ['scheduled_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_orders_workshop_approved_by_fkey';
            columns: ['workshop_approved_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_request_groups: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      maintenance_request_items: {
        Row: {
          checklist_deviation_id: string;
          created_at: string | null;
          description: string | null;
          driver_comment: string | null;
          driver_comment_by: string | null;
          id: string;
          maintenance_request_id: string;
          rejection_reason: string | null;
          repair_type_id: string | null;
          status: string;
          supervisor_comment: string | null;
          supervisor_comment_by: string | null;
          validator_comment: string | null;
          validator_comment_by: string | null;
        };
        Insert: {
          checklist_deviation_id: string;
          created_at?: string | null;
          description?: string | null;
          driver_comment?: string | null;
          driver_comment_by?: string | null;
          id?: string;
          maintenance_request_id: string;
          rejection_reason?: string | null;
          repair_type_id?: string | null;
          status?: string;
          supervisor_comment?: string | null;
          supervisor_comment_by?: string | null;
          validator_comment?: string | null;
          validator_comment_by?: string | null;
        };
        Update: {
          checklist_deviation_id?: string;
          created_at?: string | null;
          description?: string | null;
          driver_comment?: string | null;
          driver_comment_by?: string | null;
          id?: string;
          maintenance_request_id?: string;
          rejection_reason?: string | null;
          repair_type_id?: string | null;
          status?: string;
          supervisor_comment?: string | null;
          supervisor_comment_by?: string | null;
          validator_comment?: string | null;
          validator_comment_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_request_items_checklist_deviation_id_fkey';
            columns: ['checklist_deviation_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_deviations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_request_items_driver_comment_by_fkey';
            columns: ['driver_comment_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_request_items_maintenance_request_id_fkey';
            columns: ['maintenance_request_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_request_items_repair_type_id_fkey';
            columns: ['repair_type_id'];
            isOneToOne: false;
            referencedRelation: 'types_of_repairs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_request_items_supervisor_comment_by_fkey';
            columns: ['supervisor_comment_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_request_items_validator_comment_by_fkey';
            columns: ['validator_comment_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_requests: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          checklist_answer_id: string | null;
          created_at: string | null;
          employee_id: string | null;
          engine_hours: string | null;
          equipment_id: string;
          id: string;
          kilometer: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          source: string | null;
          status: string;
          supervisor_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          checklist_answer_id?: string | null;
          created_at?: string | null;
          employee_id?: string | null;
          engine_hours?: string | null;
          equipment_id: string;
          id?: string;
          kilometer?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          source?: string | null;
          status?: string;
          supervisor_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          checklist_answer_id?: string | null;
          created_at?: string | null;
          employee_id?: string | null;
          engine_hours?: string | null;
          equipment_id?: string;
          id?: string;
          kilometer?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          source?: string | null;
          status?: string;
          supervisor_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_requests_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_checklist_answer_id_fkey';
            columns: ['checklist_answer_id'];
            isOneToOne: false;
            referencedRelation: 'checklist_answers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'equipments_with_pending_deviations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_rejected_by_fkey';
            columns: ['rejected_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_supervisor_id_fkey';
            columns: ['supervisor_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
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
          icon: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          order_index: number | null;
          price: number;
          slug: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          description: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          order_index?: number | null;
          price: number;
          slug?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          order_index?: number | null;
          price?: number;
          slug?: string | null;
          updated_at?: string | null;
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
      other_equipment: {
        Row: {
          blueprints: string[];
          brand_id: number | null;
          company_id: string;
          composition: string | null;
          condition: Database['public']['Enums']['condition_enum'] | null;
          contract_expiration_date: string | null;
          contract_number: string | null;
          contract_start_date: string | null;
          cost_center_id: string | null;
          cost_type: Database['public']['Enums']['cost_type_enum'] | null;
          created_at: string;
          currency: Database['public']['Enums']['currency_enum'] | null;
          horometer: number | null;
          id: string;
          initial_value: number | null;
          intern_number: string | null;
          invoice_number: string | null;
          is_active: boolean;
          linked_vehicle_id: string | null;
          manufacturer_plate: string | null;
          model_id: number | null;
          owner_id: string | null;
          pictures: string[];
          purchase_date: string | null;
          reason_for_termination: Database['public']['Enums']['termination_reason_enum'] | null;
          sector: string | null;
          serial_number: string | null;
          status: Database['public']['Enums']['status_type'] | null;
          sub_type_id: string | null;
          termination_date: string | null;
          type_id: string;
          type_of_contract: Database['public']['Enums']['contract_type_vehicles_enum'] | null;
          user_id: string | null;
          year: string | null;
        };
        Insert: {
          blueprints?: string[];
          brand_id?: number | null;
          company_id: string;
          composition?: string | null;
          condition?: Database['public']['Enums']['condition_enum'] | null;
          contract_expiration_date?: string | null;
          contract_number?: string | null;
          contract_start_date?: string | null;
          cost_center_id?: string | null;
          cost_type?: Database['public']['Enums']['cost_type_enum'] | null;
          created_at?: string;
          currency?: Database['public']['Enums']['currency_enum'] | null;
          horometer?: number | null;
          id?: string;
          initial_value?: number | null;
          intern_number?: string | null;
          invoice_number?: string | null;
          is_active?: boolean;
          linked_vehicle_id?: string | null;
          manufacturer_plate?: string | null;
          model_id?: number | null;
          owner_id?: string | null;
          pictures?: string[];
          purchase_date?: string | null;
          reason_for_termination?: Database['public']['Enums']['termination_reason_enum'] | null;
          sector?: string | null;
          serial_number?: string | null;
          status?: Database['public']['Enums']['status_type'] | null;
          sub_type_id?: string | null;
          termination_date?: string | null;
          type_id: string;
          type_of_contract?: Database['public']['Enums']['contract_type_vehicles_enum'] | null;
          user_id?: string | null;
          year?: string | null;
        };
        Update: {
          blueprints?: string[];
          brand_id?: number | null;
          company_id?: string;
          composition?: string | null;
          condition?: Database['public']['Enums']['condition_enum'] | null;
          contract_expiration_date?: string | null;
          contract_number?: string | null;
          contract_start_date?: string | null;
          cost_center_id?: string | null;
          cost_type?: Database['public']['Enums']['cost_type_enum'] | null;
          created_at?: string;
          currency?: Database['public']['Enums']['currency_enum'] | null;
          horometer?: number | null;
          id?: string;
          initial_value?: number | null;
          intern_number?: string | null;
          invoice_number?: string | null;
          is_active?: boolean;
          linked_vehicle_id?: string | null;
          manufacturer_plate?: string | null;
          model_id?: number | null;
          owner_id?: string | null;
          pictures?: string[];
          purchase_date?: string | null;
          reason_for_termination?: Database['public']['Enums']['termination_reason_enum'] | null;
          sector?: string | null;
          serial_number?: string | null;
          status?: Database['public']['Enums']['status_type'] | null;
          sub_type_id?: string | null;
          termination_date?: string | null;
          type_id?: string;
          type_of_contract?: Database['public']['Enums']['contract_type_vehicles_enum'] | null;
          user_id?: string | null;
          year?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'other_equipment_brand_id_fkey';
            columns: ['brand_id'];
            isOneToOne: false;
            referencedRelation: 'brand_vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_cost_center_id_fkey';
            columns: ['cost_center_id'];
            isOneToOne: false;
            referencedRelation: 'cost_center';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_linked_vehicle_id_fkey';
            columns: ['linked_vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'equipments_with_pending_deviations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_linked_vehicle_id_fkey';
            columns: ['linked_vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_model_id_fkey';
            columns: ['model_id'];
            isOneToOne: false;
            referencedRelation: 'model_vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'equipment_owners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_sector_fkey';
            columns: ['sector'];
            isOneToOne: false;
            referencedRelation: 'hierarchy';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_sub_type_id_fkey';
            columns: ['sub_type_id'];
            isOneToOne: false;
            referencedRelation: 'sub_type';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_type_id_fkey';
            columns: ['type_id'];
            isOneToOne: false;
            referencedRelation: 'type';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_equipment_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      other_equipment_certifications: {
        Row: {
          created_at: string;
          equipment_id: string;
          expiration_date: string | null;
          file_url: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          equipment_id: string;
          expiration_date?: string | null;
          file_url: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          equipment_id?: string;
          expiration_date?: string | null;
          file_url?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'other_equipment_certifications_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'other_equipment';
            referencedColumns: ['id'];
          },
        ];
      };
      password_reset_tokens: {
        Row: {
          created_at: string | null;
          expires: string;
          id: string;
          profile_id: string | null;
          token: string;
          used: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          expires: string;
          id?: string;
          profile_id?: string | null;
          token: string;
          used?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          expires?: string;
          id?: string;
          profile_id?: string | null;
          token?: string;
          used?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'password_reset_tokens_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
      preparte: {
        Row: {
          areas_service_id: string | null;
          cancel_reason: string | null;
          cliente_id: string;
          company_id: string | null;
          confirmed_by: string | null;
          contrato_id: string;
          created_at: string | null;
          end_time: string | null;
          equipos_cliente: string | null;
          executionDate: string | null;
          id: string;
          item: string | null;
          jornada: string;
          numero_pedido: string | null;
          observaciones: string | null;
          preparteImage: string | null;
          quantity: number | null;
          rejected_reason: string | null;
          reprogram: string | null;
          reprogram_reason: string | null;
          requestDate: string | null;
          sector_service_id: string | null;
          solicitante: string;
          start_time: string | null;
          status: Database['public']['Enums']['preparte_status'] | null;
          subject_to_availability: boolean | null;
          tipo: string;
          updated_at: string | null;
        };
        Insert: {
          areas_service_id?: string | null;
          cancel_reason?: string | null;
          cliente_id: string;
          company_id?: string | null;
          confirmed_by?: string | null;
          contrato_id: string;
          created_at?: string | null;
          end_time?: string | null;
          equipos_cliente?: string | null;
          executionDate?: string | null;
          id?: string;
          item?: string | null;
          jornada: string;
          numero_pedido?: string | null;
          observaciones?: string | null;
          preparteImage?: string | null;
          quantity?: number | null;
          rejected_reason?: string | null;
          reprogram?: string | null;
          reprogram_reason?: string | null;
          requestDate?: string | null;
          sector_service_id?: string | null;
          solicitante: string;
          start_time?: string | null;
          status?: Database['public']['Enums']['preparte_status'] | null;
          subject_to_availability?: boolean | null;
          tipo: string;
          updated_at?: string | null;
        };
        Update: {
          areas_service_id?: string | null;
          cancel_reason?: string | null;
          cliente_id?: string;
          company_id?: string | null;
          confirmed_by?: string | null;
          contrato_id?: string;
          created_at?: string | null;
          end_time?: string | null;
          equipos_cliente?: string | null;
          executionDate?: string | null;
          id?: string;
          item?: string | null;
          jornada?: string;
          numero_pedido?: string | null;
          observaciones?: string | null;
          preparteImage?: string | null;
          quantity?: number | null;
          rejected_reason?: string | null;
          reprogram?: string | null;
          reprogram_reason?: string | null;
          requestDate?: string | null;
          sector_service_id?: string | null;
          solicitante?: string;
          start_time?: string | null;
          status?: Database['public']['Enums']['preparte_status'] | null;
          subject_to_availability?: boolean | null;
          tipo?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'preparte_areas_service_id_fkey';
            columns: ['areas_service_id'];
            isOneToOne: false;
            referencedRelation: 'service_areas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preparte_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preparte_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preparte_contrato_id_fkey';
            columns: ['contrato_id'];
            isOneToOne: false;
            referencedRelation: 'customer_services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preparte_equipos_cliente_fkey';
            columns: ['equipos_cliente'];
            isOneToOne: false;
            referencedRelation: 'equipos_clientes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preparte_item_fkey';
            columns: ['item'];
            isOneToOne: false;
            referencedRelation: 'service_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preparte_reprogram_fkey';
            columns: ['reprogram'];
            isOneToOne: false;
            referencedRelation: 'preparte';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preparte_sector_service_id_fkey';
            columns: ['sector_service_id'];
            isOneToOne: false;
            referencedRelation: 'service_sectors';
            referencedColumns: ['id'];
          },
        ];
      };
      preparte_change_logs: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          field_name: string;
          id: string;
          metadata: Json | null;
          new_value: string | null;
          old_value: string | null;
          preparte_id: string;
          reason: string;
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          field_name: string;
          id?: string;
          metadata?: Json | null;
          new_value?: string | null;
          old_value?: string | null;
          preparte_id: string;
          reason: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          field_name?: string;
          id?: string;
          metadata?: Json | null;
          new_value?: string | null;
          old_value?: string | null;
          preparte_id?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'preparte_change_logs_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['credential_id'];
          },
          {
            foreignKeyName: 'preparte_change_logs_preparte_id_fkey';
            columns: ['preparte_id'];
            isOneToOne: false;
            referencedRelation: 'preparte';
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
          employee_id: string | null;
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
          employee_id?: string | null;
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
          employee_id?: string | null;
          fullname?: string | null;
          id?: string;
          modulos?: Database['public']['Enums']['modulos'][] | null;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
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
      remito_documents: {
        Row: {
          created_at: string | null;
          document_name: string;
          document_path: string;
          id: string;
          remit_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          document_name: string;
          document_path: string;
          id?: string;
          remit_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          document_name?: string;
          document_path?: string;
          id?: string;
          remit_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'remito_documents_remit_id_fkey';
            columns: ['remit_id'];
            isOneToOne: false;
            referencedRelation: 'remitos';
            referencedColumns: ['id'];
          },
        ];
      };
      remitos: {
        Row: {
          created_at: string | null;
          daily_report_row_id: string;
          id: string;
          is_linked: boolean;
          remit_number: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          daily_report_row_id: string;
          id?: string;
          is_linked?: boolean;
          remit_number: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          daily_report_row_id?: string;
          id?: string;
          is_linked?: boolean;
          remit_number?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'remitos_daily_report_row_id_fkey';
            columns: ['daily_report_row_id'];
            isOneToOne: false;
            referencedRelation: 'dailyreportrows';
            referencedColumns: ['id'];
          },
        ];
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
            referencedRelation: 'equipments_with_pending_deviations';
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
      role_permissions: {
        Row: {
          action_id: string;
          created_at: string | null;
          id: string;
          role_id: number;
          tab_id: string;
        };
        Insert: {
          action_id: string;
          created_at?: string | null;
          id?: string;
          role_id: number;
          tab_id: string;
        };
        Update: {
          action_id?: string;
          created_at?: string | null;
          id?: string;
          role_id?: number;
          tab_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_action_id_fkey';
            columns: ['action_id'];
            isOneToOne: false;
            referencedRelation: 'actions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'role_permissions_tab_id_fkey';
            columns: ['tab_id'];
            isOneToOne: false;
            referencedRelation: 'tabs';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          color: string | null;
          created_at: string;
          description: string | null;
          id: number;
          intern: boolean | null;
          is_active: boolean | null;
          is_system: boolean | null;
          name: string;
          slug: string | null;
          updated_at: string | null;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: number;
          intern?: boolean | null;
          is_active?: boolean | null;
          is_system?: boolean | null;
          name: string;
          slug?: string | null;
          updated_at?: string | null;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: number;
          intern?: boolean | null;
          is_active?: boolean | null;
          is_system?: boolean | null;
          name?: string;
          slug?: string | null;
          updated_at?: string | null;
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
      sector_repair_types: {
        Row: {
          created_at: string | null;
          id: string;
          repair_type_id: string;
          workshop_sector_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          repair_type_id: string;
          workshop_sector_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          repair_type_id?: string;
          workshop_sector_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sector_repair_types_repair_type_id_fkey';
            columns: ['repair_type_id'];
            isOneToOne: false;
            referencedRelation: 'types_of_repairs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sector_repair_types_workshop_sector_id_fkey';
            columns: ['workshop_sector_id'];
            isOneToOne: false;
            referencedRelation: 'workshop_sectors';
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
          needs_equipment: boolean;
          needs_personnel: boolean;
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
          needs_equipment?: boolean;
          needs_personnel?: boolean;
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
          needs_equipment?: boolean;
          needs_personnel?: boolean;
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
          is_active: boolean;
          modules: Database['public']['Enums']['modulos'][] | null;
          profile_id: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          is_active?: boolean;
          modules?: Database['public']['Enums']['modulos'][] | null;
          profile_id?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          is_active?: boolean;
          modules?: Database['public']['Enums']['modulos'][] | null;
          profile_id?: string | null;
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
        ];
      };
      sub_type: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean | null;
          name: string;
          tire_template_id: string | null;
          type: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
          tire_template_id?: string | null;
          type?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          tire_template_id?: string | null;
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
            foreignKeyName: 'sub_type_tire_template_id_fkey';
            columns: ['tire_template_id'];
            isOneToOne: false;
            referencedRelation: 'tire_templates';
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
      sub_type_compatible_items: {
        Row: {
          compatible_item_id: string;
          created_at: string;
          id: string;
          item_type: string;
          sub_type_id: string;
        };
        Insert: {
          compatible_item_id: string;
          created_at?: string;
          id?: string;
          item_type: string;
          sub_type_id: string;
        };
        Update: {
          compatible_item_id?: string;
          created_at?: string;
          id?: string;
          item_type?: string;
          sub_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sub_type_compatible_items_sub_type_id_fkey';
            columns: ['sub_type_id'];
            isOneToOne: false;
            referencedRelation: 'sub_type';
            referencedColumns: ['id'];
          },
        ];
      };
      tabs: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          module_id: string;
          name: string;
          order_index: number | null;
          parent_tab_id: string | null;
          slug: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          module_id: string;
          name: string;
          order_index?: number | null;
          parent_tab_id?: string | null;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          module_id?: string;
          name?: string;
          order_index?: number | null;
          parent_tab_id?: string | null;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tabs_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tabs_parent_tab_id_fkey';
            columns: ['parent_tab_id'];
            isOneToOne: false;
            referencedRelation: 'tabs';
            referencedColumns: ['id'];
          },
        ];
      };
      type: {
        Row: {
          applies_to: string | null;
          company_id: string | null;
          created_at: string;
          generates_qr: boolean | null;
          has_hitch: boolean | null;
          id: string;
          is_active: boolean | null;
          is_operative: boolean | null;
          is_tractor_unit: boolean | null;
          name: string;
        };
        Insert: {
          applies_to?: string | null;
          company_id?: string | null;
          created_at?: string;
          generates_qr?: boolean | null;
          has_hitch?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          is_operative?: boolean | null;
          is_tractor_unit?: boolean | null;
          name: string;
        };
        Update: {
          applies_to?: string | null;
          company_id?: string | null;
          created_at?: string;
          generates_qr?: boolean | null;
          has_hitch?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          is_operative?: boolean | null;
          is_tractor_unit?: boolean | null;
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
      type_hitch_types: {
        Row: {
          compatible_type_id: string;
          created_at: string | null;
          id: string;
          type_id: string;
        };
        Insert: {
          compatible_type_id: string;
          created_at?: string | null;
          id?: string;
          type_id: string;
        };
        Update: {
          compatible_type_id?: string;
          created_at?: string | null;
          id?: string;
          type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'type_hitch_types_compatible_type_id_fkey';
            columns: ['compatible_type_id'];
            isOneToOne: false;
            referencedRelation: 'type';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'type_hitch_types_type_id_fkey';
            columns: ['type_id'];
            isOneToOne: false;
            referencedRelation: 'type';
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
          autorizable: boolean;
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
          autorizable?: boolean;
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
          autorizable?: boolean;
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
      user_permissions: {
        Row: {
          action_id: string;
          assigned_by: string | null;
          created_at: string | null;
          id: string;
          is_granted: boolean | null;
          tab_id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          action_id: string;
          assigned_by?: string | null;
          created_at?: string | null;
          id?: string;
          is_granted?: boolean | null;
          tab_id: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          action_id?: string;
          assigned_by?: string | null;
          created_at?: string | null;
          id?: string;
          is_granted?: boolean | null;
          tab_id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_permissions_action_id_fkey';
            columns: ['action_id'];
            isOneToOne: false;
            referencedRelation: 'actions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_permissions_tab_id_fkey';
            columns: ['tab_id'];
            isOneToOne: false;
            referencedRelation: 'tabs';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          assigned_at: string | null;
          assigned_by: string | null;
          id: string;
          role_id: number;
          user_id: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_by?: string | null;
          id?: string;
          role_id: number;
          user_id: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_by?: string | null;
          id?: string;
          role_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_table_preferences: {
        Row: {
          created_at: string;
          preferences: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          preferences?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          preferences?: Json;
          updated_at?: string;
          user_id?: string;
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
          contract_expiration_date: string | null;
          contract_number: string | null;
          contract_start_date: string | null;
          cost_center_id: string | null;
          cost_type: Database['public']['Enums']['cost_type_enum'] | null;
          created_at: string;
          currency: Database['public']['Enums']['currency_enum'] | null;
          domain: string | null;
          engine: string;
          engine_hours: string | null;
          id: string;
          intern_number: string | null;
          is_active: boolean | null;
          kilometer: string | null;
          model: number | null;
          owner_id: string | null;
          picture: string | null;
          price: number | null;
          reason_for_termination: Database['public']['Enums']['termination_reason_enum'] | null;
          sector: string | null;
          serie: string | null;
          status: Database['public']['Enums']['status_type'] | null;
          subType: string | null;
          termination_date: string | null;
          tire_template_id: string | null;
          type: string;
          type_of_contract: Database['public']['Enums']['contract_type_vehicles_enum'] | null;
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
          contract_expiration_date?: string | null;
          contract_number?: string | null;
          contract_start_date?: string | null;
          cost_center_id?: string | null;
          cost_type?: Database['public']['Enums']['cost_type_enum'] | null;
          created_at?: string;
          currency?: Database['public']['Enums']['currency_enum'] | null;
          domain?: string | null;
          engine: string;
          engine_hours?: string | null;
          id?: string;
          intern_number?: string | null;
          is_active?: boolean | null;
          kilometer?: string | null;
          model?: number | null;
          owner_id?: string | null;
          picture?: string | null;
          price?: number | null;
          reason_for_termination?: Database['public']['Enums']['termination_reason_enum'] | null;
          sector?: string | null;
          serie?: string | null;
          status?: Database['public']['Enums']['status_type'] | null;
          subType?: string | null;
          termination_date?: string | null;
          tire_template_id?: string | null;
          type: string;
          type_of_contract?: Database['public']['Enums']['contract_type_vehicles_enum'] | null;
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
          contract_expiration_date?: string | null;
          contract_number?: string | null;
          contract_start_date?: string | null;
          cost_center_id?: string | null;
          cost_type?: Database['public']['Enums']['cost_type_enum'] | null;
          created_at?: string;
          currency?: Database['public']['Enums']['currency_enum'] | null;
          domain?: string | null;
          engine?: string;
          engine_hours?: string | null;
          id?: string;
          intern_number?: string | null;
          is_active?: boolean | null;
          kilometer?: string | null;
          model?: number | null;
          owner_id?: string | null;
          picture?: string | null;
          price?: number | null;
          reason_for_termination?: Database['public']['Enums']['termination_reason_enum'] | null;
          sector?: string | null;
          serie?: string | null;
          status?: Database['public']['Enums']['status_type'] | null;
          subType?: string | null;
          termination_date?: string | null;
          tire_template_id?: string | null;
          type?: string;
          type_of_contract?: Database['public']['Enums']['contract_type_vehicles_enum'] | null;
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
            foreignKeyName: 'vehicles_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'equipment_owners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_sector_fkey';
            columns: ['sector'];
            isOneToOne: false;
            referencedRelation: 'hierarchy';
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
      work_order_item_repairs: {
        Row: {
          added_by: string | null;
          approved_at: string | null;
          approved_by: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          id: string;
          is_diagnostico: boolean;
          is_operator_added: boolean | null;
          original_sector_id: string | null;
          rejection_reason: string | null;
          repair_type_id: string;
          return_reason: string | null;
          status: Database['public']['Enums']['work_order_item_status'];
          technician_notes: string | null;
          technician_notes_by: string | null;
          updated_at: string | null;
          work_order_item_id: string;
        };
        Insert: {
          added_by?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          id?: string;
          is_diagnostico?: boolean;
          is_operator_added?: boolean | null;
          original_sector_id?: string | null;
          rejection_reason?: string | null;
          repair_type_id: string;
          return_reason?: string | null;
          status?: Database['public']['Enums']['work_order_item_status'];
          technician_notes?: string | null;
          technician_notes_by?: string | null;
          updated_at?: string | null;
          work_order_item_id: string;
        };
        Update: {
          added_by?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          id?: string;
          is_diagnostico?: boolean;
          is_operator_added?: boolean | null;
          original_sector_id?: string | null;
          rejection_reason?: string | null;
          repair_type_id?: string;
          return_reason?: string | null;
          status?: Database['public']['Enums']['work_order_item_status'];
          technician_notes?: string | null;
          technician_notes_by?: string | null;
          updated_at?: string | null;
          work_order_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'work_order_item_repairs_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_order_item_repairs_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_order_item_repairs_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_order_item_repairs_original_sector_id_fkey';
            columns: ['original_sector_id'];
            isOneToOne: false;
            referencedRelation: 'workshop_sectors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_order_item_repairs_repair_type_id_fkey';
            columns: ['repair_type_id'];
            isOneToOne: false;
            referencedRelation: 'types_of_repairs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_order_item_repairs_technician_notes_by_fkey';
            columns: ['technician_notes_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_order_item_repairs_work_order_item_id_fkey';
            columns: ['work_order_item_id'];
            isOneToOne: false;
            referencedRelation: 'work_order_items';
            referencedColumns: ['id'];
          },
        ];
      };
      work_order_items: {
        Row: {
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          id: string;
          maintenance_order_item_id: string;
          status: Database['public']['Enums']['work_order_item_status'];
          technician_notes: string | null;
          updated_at: string | null;
          work_order_id: string;
        };
        Insert: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          id?: string;
          maintenance_order_item_id: string;
          status?: Database['public']['Enums']['work_order_item_status'];
          technician_notes?: string | null;
          updated_at?: string | null;
          work_order_id: string;
        };
        Update: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          id?: string;
          maintenance_order_item_id?: string;
          status?: Database['public']['Enums']['work_order_item_status'];
          technician_notes?: string | null;
          updated_at?: string | null;
          work_order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'work_order_items_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_order_items_maintenance_order_item_id_fkey';
            columns: ['maintenance_order_item_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_order_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_order_items_work_order_id_fkey';
            columns: ['work_order_id'];
            isOneToOne: false;
            referencedRelation: 'work_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      work_orders: {
        Row: {
          actual_end_date: string | null;
          actual_start_date: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          created_by: string | null;
          equipment_id: string;
          id: string;
          notes: string | null;
          order_number: string;
          pause_reason: string | null;
          paused_at: string | null;
          paused_by: string | null;
          planned_end_date: string;
          planned_start_date: string;
          priority: Database['public']['Enums']['work_order_priority'];
          sector_id: string | null;
          sequence_number: number;
          started_at: string | null;
          started_by: string | null;
          status: Database['public']['Enums']['work_order_status'];
          total_paused_time: string | null;
          updated_at: string | null;
          workshop_id: string;
        };
        Insert: {
          actual_end_date?: string | null;
          actual_start_date?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          company_id: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          equipment_id: string;
          id?: string;
          notes?: string | null;
          order_number: string;
          pause_reason?: string | null;
          paused_at?: string | null;
          paused_by?: string | null;
          planned_end_date: string;
          planned_start_date: string;
          priority?: Database['public']['Enums']['work_order_priority'];
          sector_id?: string | null;
          sequence_number: number;
          started_at?: string | null;
          started_by?: string | null;
          status?: Database['public']['Enums']['work_order_status'];
          total_paused_time?: string | null;
          updated_at?: string | null;
          workshop_id: string;
        };
        Update: {
          actual_end_date?: string | null;
          actual_start_date?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          company_id?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          equipment_id?: string;
          id?: string;
          notes?: string | null;
          order_number?: string;
          pause_reason?: string | null;
          paused_at?: string | null;
          paused_by?: string | null;
          planned_end_date?: string;
          planned_start_date?: string;
          priority?: Database['public']['Enums']['work_order_priority'];
          sector_id?: string | null;
          sequence_number?: number;
          started_at?: string | null;
          started_by?: string | null;
          status?: Database['public']['Enums']['work_order_status'];
          total_paused_time?: string | null;
          updated_at?: string | null;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'work_orders_cancelled_by_fkey';
            columns: ['cancelled_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_orders_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_orders_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_orders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_orders_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'equipments_with_pending_deviations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_orders_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_orders_paused_by_fkey';
            columns: ['paused_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_orders_sector_id_fkey';
            columns: ['sector_id'];
            isOneToOne: false;
            referencedRelation: 'workshop_sectors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_orders_started_by_fkey';
            columns: ['started_by'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_orders_workshop_id_fkey';
            columns: ['workshop_id'];
            isOneToOne: false;
            referencedRelation: 'workshops';
            referencedColumns: ['id'];
          },
        ];
      };
      workshop_sectors: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          max_capacity: number | null;
          name: string;
          updated_at: string;
          workshop_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          max_capacity?: number | null;
          name: string;
          updated_at?: string;
          workshop_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          max_capacity?: number | null;
          name?: string;
          updated_at?: string;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workshop_sectors_workshop_id_fkey';
            columns: ['workshop_id'];
            isOneToOne: false;
            referencedRelation: 'workshops';
            referencedColumns: ['id'];
          },
        ];
      };
      workshops: {
        Row: {
          address: string | null;
          city: number | null;
          company_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          latitude: number | null;
          longitude: number | null;
          name: string;
          provider_email: string | null;
          provider_name: string | null;
          provider_phone: string | null;
          province: number | null;
          type: Database['public']['Enums']['workshop_type'];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city?: number | null;
          company_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          provider_email?: string | null;
          provider_name?: string | null;
          provider_phone?: string | null;
          province?: number | null;
          type?: Database['public']['Enums']['workshop_type'];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: number | null;
          company_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          provider_email?: string | null;
          provider_name?: string | null;
          provider_phone?: string | null;
          province?: number | null;
          type?: Database['public']['Enums']['workshop_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workshops_city_fkey';
            columns: ['city'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workshops_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workshops_province_fkey';
            columns: ['province'];
            isOneToOne: false;
            referencedRelation: 'provinces';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      equipments_with_pending_deviations: {
        Row: {
          company_id: string | null;
          deviation_count: number | null;
          domain: string | null;
          id: string | null;
          intern_number: string | null;
          last_deviation_date: string | null;
          serie: string | null;
          type_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicles_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      actualizar_estado_daily_reports: { Args: never; Returns: undefined };
      actualizar_estado_documentos: { Args: never; Returns: undefined };
      ad_ausentismo_diario: {
        Args: { p_company_id: string; p_date: string };
        Returns: Json;
      };
      build_employee_where: { Args: { _conditions: Json }; Returns: string };
      build_employee_where_alias: {
        Args: { _conditions: Json; table_alias: string };
        Returns: string;
      };
      build_vehicle_where: { Args: { _conditions: Json }; Returns: string };
      build_vehicle_where_alias: {
        Args: { _conditions: Json; table_alias: string };
        Returns: string;
      };
      check_diagram_conflicts_with_operations:
        | {
            Args: {
              p_date_from: string;
              p_date_to: string;
              p_employee_ids: string[];
            };
            Returns: {
              can_update: boolean;
              conflict_type: string;
              current_diagram_color: string;
              current_diagram_name: string;
              current_diagram_type: string;
              date_formatted: string;
              day: number;
              employee_id: string;
              employee_name: string;
              is_used_in_operations: boolean;
              month: number;
              operation_details: string;
              year: number;
            }[];
          }
        | {
            Args: {
              p_date_from: string;
              p_date_to: string;
              p_diagram_type_id: string;
              p_employee_ids: string[];
            };
            Returns: {
              conflict_type: string;
              current_diagram_color: string;
              current_diagram_id: string;
              current_diagram_name: string;
              date_formatted: string;
              date_value: string;
              employee_id: string;
              employee_name: string;
              operation_details: string;
            }[];
          };
      check_diagram_conflicts_with_operations_v2:
        | {
            Args: {
              p_active_novelty_id: string;
              p_date_from: string;
              p_date_to: string;
              p_employee_ids: string[];
              p_work_diagram_id: string;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_date_from: string;
              p_date_to: string;
              p_employee_ids: string[];
              p_work_diagram_id: string;
            };
            Returns: Json;
          };
      check_multiple_permissions: {
        Args: { p_permissions: Json; p_user_id: string };
        Returns: {
          action_slug: string;
          has_permission: boolean;
          module_slug: string;
          tab_slug: string;
        }[];
      };
      check_novelty_conflicts: {
        Args: {
          p_date_from: string;
          p_date_to: string;
          p_diagram_type_id: string;
          p_employee_ids: string[];
        };
        Returns: Json;
      };
      collect_daily_indicators: {
        Args: {
          p_company_id: string;
          p_company_position_ids?: string[];
          p_date?: string;
          p_position_uuids?: string[];
          p_vehicle_type_ids?: string[];
          p_vehicle_types?: string[];
        };
        Returns: undefined;
      };
      controlar_alertas_documentos_single_employee: {
        Args: { company_id_param: string; employee_id_param: string };
        Returns: undefined;
      };
      controlar_alertas_documentos_single_vehicle: {
        Args: { company_id_param: string; vehicle_id_param: string };
        Returns: undefined;
      };
      controlar_alertas_single_document_all_employees: {
        Args: { document_type_id_param: string };
        Returns: undefined;
      };
      controlar_alertas_single_document_all_vehicles: {
        Args: { document_type_id_param: string };
        Returns: undefined;
      };
      create_massive_diagrams_with_validations: {
        Args: {
          p_date_from: string;
          p_date_to: string;
          p_diagram_type_id: string;
          p_employee_ids: string[];
        };
        Returns: Json;
      };
      delete_expired_subscriptions: { Args: never; Returns: undefined };
      ea_total_equipos_aptos: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      eami_equipos_movimientos_internos: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      edo_disponibilidad_operacional_mantenimiento: {
        Args: { p_company_id: string; p_date: string };
        Returns: Json;
      };
      emi_disponibilidad_operacional_mi: {
        Args: { p_company_id: string; p_date: string };
        Returns: Json;
      };
      eno_total_equipos_no_operativos: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      enviar_documentos_a_46_dias: { Args: never; Returns: undefined };
      enviar_documentos_vencidos: { Args: never; Returns: undefined };
      eoa_total_equipos_operativos: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      eoc_disponibilidad_operacional_cliente: {
        Args: { p_company_id: string; p_date: string };
        Returns: Json;
      };
      filter_employees_by_conditions: {
        Args: { p_company_id: string; p_filters: Json };
        Returns: {
          firstname: string;
          id: string;
          lastname: string;
          matching_conditions: Json;
          picture: string;
        }[];
      };
      filter_vehicles_by_conditions: {
        Args: { p_company_id: string; p_filters: Json };
        Returns: {
          brand_name: string;
          id: string;
          matching_conditions: Json;
          model_name: string;
          picture: string;
        }[];
      };
      find_employee_by_full_name_v2: {
        Args: { p_company_id: string; p_full_name: string };
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
          cost_type: Database['public']['Enums']['cost_type_enum'] | null;
          covenants_id: string | null;
          created_at: string;
          cuil: string;
          date_of_admission: string;
          document_number: string;
          document_type: Database['public']['Enums']['document_type_enum'] | null;
          email: string | null;
          file: string;
          firstname: string;
          full_name: string | null;
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
          workshop_sector_id: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'employees';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      generate_kpi_code: { Args: { company_uuid: string }; Returns: string };
      get_company_counts_indicator: {
        Args: { p_company_id?: string; save_to_table?: boolean };
        Returns: {
          employee_count: number;
          total_count: number;
          vehicle_count: number;
        }[];
      };
      get_company_for_user: { Args: { user_id: string }; Returns: string };
      get_daily_report_deviations:
        | { Args: { p_daily_report_id: string }; Returns: Json }
        | {
            Args: { p_daily_report_id: string; p_report_date: string };
            Returns: Json;
          };
      get_dailyreportrow_history: {
        Args: { p_row_id: string };
        Returns: {
          action_type: string;
          changed_by: Json;
          changed_data: Json;
          changed_fields: Json;
          created_at: string;
          id: string;
          metadata: Json;
          reassignment_reason: string;
          related_id: string;
          related_table: string;
        }[];
      };
      get_employee_diagram_count_by_day: {
        Args: {
          p_company_id?: string;
          p_company_position_ids?: string[];
          p_day: number;
          p_month: number;
          p_year: number;
          save_to_table?: boolean;
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
        Args: {
          p_company_id?: string;
          position_uuids?: string[];
          save_to_table?: boolean;
        };
        Returns: {
          employees_operativos: number;
          employees_used: number;
          indicator: number;
        }[];
      };
      get_employees_not_in_daily_report: {
        Args: { p_company_id?: string; position_uuids?: string[] };
        Returns: {
          company_position: string;
          cuil: string;
          customers: Json;
          diagram_color: string;
          diagram_short_description: string;
          diagram_type_id: string;
          diagram_type_name: string;
          employee_id: string;
          firstname: string;
          lastname: string;
          position_name: string;
        }[];
      };
      get_kpi_range: {
        Args: {
          p_company_id: string;
          p_from_date: string;
          p_kpi_code: string;
          p_to_date: string;
        };
        Returns: {
          indicator: number;
          raw_data: Json;
          snapshot_date: string;
        }[];
      };
      get_max_order_number: { Args: never; Returns: string };
      get_services_summary_by_type: {
        Args: { p_company_id: string; save_to_history?: boolean };
        Returns: {
          percentage: number;
          service_count: number;
          type_service: string;
        }[];
      };
      get_user_accessible_modules: {
        Args: { p_user_id: string };
        Returns: {
          module_icon: string;
          module_id: string;
          module_name: string;
          module_slug: string;
        }[];
      };
      get_user_permissions: {
        Args: { p_user_id: string };
        Returns: {
          action_id: string;
          action_name: string;
          action_slug: string;
          is_granted: boolean;
          module_id: string;
          module_name: string;
          module_slug: string;
          role_color: string;
          role_id: number;
          role_name: string;
          source: string;
          tab_id: string;
          tab_name: string;
          tab_slug: string;
        }[];
      };
      get_vehicle_usage_indicator: {
        Args: {
          p_company_id?: string;
          p_vehicle_type_ids?: string[];
          save_to_table?: boolean;
        };
        Returns: {
          available_units: number;
          not_available_units: number;
          subtype_id: string;
          subtype_name: string;
          type_id: string;
          type_name: string;
          usage_indicator: number;
          used_units: number;
        }[];
      };
      get_vehicles_non_operative: {
        Args: { p_company_id?: string; vehicle_type_ids?: string[] };
        Returns: {
          brand: number;
          brand_name: string;
          condition: string;
          customers: Json;
          domain: string;
          intern_number: string;
          model: number;
          model_name: string;
          serie: string;
          sub_type_id: string;
          sub_type_name: string;
          type_id: string;
          type_name: string;
          type_operative_id: string;
          type_operative_name: string;
          vehicle_id: string;
          year: number;
        }[];
      };
      get_vehicles_not_in_daily_report: {
        Args: { p_company_id?: string; vehicle_type_ids?: string[] };
        Returns: {
          brand: number;
          brand_name: string;
          condition: string;
          customers: Json;
          domain: string;
          intern_number: string;
          model: number;
          model_name: string;
          serie: string;
          sub_type_id: string;
          sub_type_name: string;
          type_id: string;
          type_name: string;
          type_operative_id: string;
          type_operative_name: string;
          vehicle_id: string;
          year: number;
        }[];
      };
      hr_get_absenteeism_summary: {
        Args: {
          p_company_id: string;
          p_from?: string;
          p_to?: string;
          save_to_table?: boolean;
        };
        Returns: Json;
      };
      hr_get_absenteeism_trend: {
        Args: {
          p_company_id: string;
          p_from?: string;
          p_to?: string;
          save_to_table?: boolean;
        };
        Returns: Json;
      };
      hr_get_current_absent_employees: {
        Args: { p_company_id: string; p_date?: string; save_to_table?: boolean };
        Returns: Json;
      };
      hr_get_daily_absence_timeseries: {
        Args: {
          p_company_id: string;
          p_from?: string;
          p_to?: string;
          save_to_table?: boolean;
        };
        Returns: Json;
      };
      hr_get_department_absence_reasons: {
        Args: { p_company_id: string; p_date?: string; save_to_table?: boolean };
        Returns: Json;
      };
      hr_get_department_absence_summary: {
        Args: { p_company_id: string; p_date?: string; save_to_table?: boolean };
        Returns: Json;
      };
      marcar_prepartes_vencidos: { Args: never; Returns: undefined };
      migrate_document: {
        Args: { execute_migration?: boolean; target_id: string };
        Returns: {
          action_taken: string;
          error_message: string;
          new_path: string;
          old_path: string;
          storage_migration_id: string;
          success: boolean;
        }[];
      };
      migrate_documents_preview: {
        Args: never;
        Returns: {
          error_message: string;
          new_path: string;
          old_path: string;
          success: boolean;
        }[];
      };
      obtener_documentos_por_vencer: {
        Args: never;
        Returns: {
          correo_electronico: string;
          documento_empleado: string;
          dominio_vehiculo: string;
          fecha_vencimiento: string;
          tipo_documento: string;
        }[];
      };
      pmi_personal_mi: {
        Args: { p_company_id: string; p_date: string };
        Returns: Json;
      };
      pp_productividad_personal: {
        Args: { p_company_id: string; p_date: string };
        Returns: Json;
      };
      process_massive_diagram_creation_v2: {
        Args: {
          p_active_novelty_id: string;
          p_conflict_resolution: string;
          p_date_from: string;
          p_date_to: string;
          p_employee_ids: string[];
          p_work_diagram_id: string;
        };
        Returns: Json;
      };
      process_massive_novelty_creation: {
        Args: {
          p_conflict_resolution: string;
          p_date_from: string;
          p_date_to: string;
          p_diagram_type_id: string;
          p_employee_ids: string[];
        };
        Returns: Json;
      };
      pruebaemail: { Args: never; Returns: undefined };
      resume_work_order: {
        Args: { p_paused_seconds: number; p_work_order_id: string };
        Returns: {
          actual_end_date: string | null;
          actual_start_date: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          created_by: string | null;
          equipment_id: string;
          id: string;
          notes: string | null;
          order_number: string;
          pause_reason: string | null;
          paused_at: string | null;
          paused_by: string | null;
          planned_end_date: string;
          planned_start_date: string;
          priority: Database['public']['Enums']['work_order_priority'];
          sector_id: string | null;
          sequence_number: number;
          started_at: string | null;
          started_by: string | null;
          status: Database['public']['Enums']['work_order_status'];
          total_paused_time: string | null;
          updated_at: string | null;
          workshop_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'work_orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      run_daily_indicators_for_all_companies: {
        Args: never;
        Returns: undefined;
      };
      select_distinct_values: {
        Args: {
          p_column_path: string;
          p_filters?: Json;
          p_join_mappings?: Json;
          p_multi_join_paths?: Json;
          p_table_name: string;
        };
        Returns: {
          col_count: number;
          col_value: string;
        }[];
      };
      set_reassignment_reason: { Args: { reason: string }; Returns: undefined };
      ta_total_ausentes: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      te_total_empleados: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      teoa_total_equipos_operativos_ajustado: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      teoc_equipos_operativos_en_clientes: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      tmi_total_personal_mi: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      tpa_total_personal_apto: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      tpc_total_personal_clientes: {
        Args: { p_company_id: string; p_date: string };
        Returns: number;
      };
      update_employee_diagram_status: {
        Args: { p_employee_id: string; p_is_active: boolean };
        Returns: Json;
      };
      update_vehicle_kilometer_anonymous: {
        Args: { p_kilometer: string; p_vehicle_id: string };
        Returns: undefined;
      };
      user_has_permission: {
        Args: {
          p_action_slug: string;
          p_module_slug: string;
          p_tab_slug: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      verificar_documentos_vencidos_prueba: { Args: never; Returns: undefined };
    };
    Enums: {
      affiliate_status_enum: 'Dentro de convenio' | 'Fuera de convenio';
      condition_enum: 'operativo' | 'no operativo' | 'en reparacion' | 'operativo condicionado' | 'en preparacion';
      contract_type_enum: 'Leasing' | 'Alquiler' | 'Prendado';
      contract_type_vehicles_enum: 'Leasing' | 'Alquiler' | 'Propio' | 'Prendado';
      cost_type_enum: 'Directo' | 'Indirecto';
      currency_enum: 'USD' | 'EUR' | 'GBP' | 'ARS';
      daily_report_header_status_new: 'abierto' | 'cerrado' | 'cerrado_completo' | 'cerrado_incompleto';
      daily_report_status:
        | 'pendiente'
        | 'sin_recursos_asignados'
        | 'ejecutado'
        | 'reprogramado'
        | 'cancelado'
        | '.'
        | '..'
        | 'en_certificacion';
      daily_report_type_enum: 'mensual' | 'adicional' | 'adicional_permanente';
      document_applies: 'Persona' | 'Equipos' | 'Empresa';
      document_type_enum: 'DNI' | 'LE' | 'LC' | 'PASAPORTE';
      employee_daily_report_role: 'chofer_dia' | 'chofer_noche' | 'ayudante_dia' | 'ayudante_noche';
      gender_enum: 'Masculino' | 'Femenino' | 'No Declarado';
      indicator_function:
        | 'get_vehicle_usage_indicator'
        | 'get_employee_usage_indicator'
        | 'get_employee_diagram_count_by_day'
        | 'get_company_counts_indicator'
        | 'hr_get_absenteeism_summary'
        | 'hr_get_absenteeism_trend'
        | 'hr_get_current_absent_employees'
        | 'hr_get_daily_absence_timeseries'
        | 'hr_get_department_absence_reasons'
        | 'hr_get_department_absence_summary';
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
      preparte_status: 'pendiente' | 'cancelado' | 'reprogramado' | 'rechazado' | 'vencido' | 'confirmado';
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
      work_order_item_status:
        | 'pending'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'pending_approval'
        | 'reassignment_requested'
        | 'rejected';
      work_order_priority: 'urgent' | 'high' | 'medium' | 'low';
      work_order_status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'completed_partial' | 'cancelled';
      workshop_type: 'interno' | 'externo';
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      affiliate_status_enum: ['Dentro de convenio', 'Fuera de convenio'],
      condition_enum: ['operativo', 'no operativo', 'en reparacion', 'operativo condicionado', 'en preparacion'],
      contract_type_enum: ['Leasing', 'Alquiler', 'Prendado'],
      contract_type_vehicles_enum: ['Leasing', 'Alquiler', 'Propio', 'Prendado'],
      cost_type_enum: ['Directo', 'Indirecto'],
      currency_enum: ['USD', 'EUR', 'GBP', 'ARS'],
      daily_report_header_status_new: ['abierto', 'cerrado', 'cerrado_completo', 'cerrado_incompleto'],
      daily_report_status: [
        'pendiente',
        'sin_recursos_asignados',
        'ejecutado',
        'reprogramado',
        'cancelado',
        '.',
        '..',
        'en_certificacion',
      ],
      daily_report_type_enum: ['mensual', 'adicional', 'adicional_permanente'],
      document_applies: ['Persona', 'Equipos', 'Empresa'],
      document_type_enum: ['DNI', 'LE', 'LC', 'PASAPORTE'],
      employee_daily_report_role: ['chofer_dia', 'chofer_noche', 'ayudante_dia', 'ayudante_noche'],
      gender_enum: ['Masculino', 'Femenino', 'No Declarado'],
      indicator_function: [
        'get_vehicle_usage_indicator',
        'get_employee_usage_indicator',
        'get_employee_diagram_count_by_day',
        'get_company_counts_indicator',
        'hr_get_absenteeism_summary',
        'hr_get_absenteeism_trend',
        'hr_get_current_absent_employees',
        'hr_get_daily_absence_timeseries',
        'hr_get_department_absence_reasons',
        'hr_get_department_absence_summary',
      ],
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
      preparte_status: ['pendiente', 'cancelado', 'reprogramado', 'rechazado', 'vencido', 'confirmado'],
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
      work_order_item_status: [
        'pending',
        'in_progress',
        'completed',
        'cancelled',
        'pending_approval',
        'reassignment_requested',
        'rejected',
      ],
      work_order_priority: ['urgent', 'high', 'medium', 'low'],
      work_order_status: ['pending', 'in_progress', 'paused', 'completed', 'completed_partial', 'cancelled'],
      workshop_type: ['interno', 'externo'],
    },
  },
} as const;
