export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          default_template_id: string | null
          email: string | null
          iban: string | null
          id: string
          logo_url: string | null
          multiplier: number
          phone: string | null
          signature_profile_id: string | null
          tax_no: string | null
          tax_office: string | null
          title: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          default_template_id?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          multiplier?: number
          phone?: string | null
          signature_profile_id?: string | null
          tax_no?: string | null
          tax_office?: string | null
          title: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          default_template_id?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          multiplier?: number
          phone?: string | null
          signature_profile_id?: string | null
          tax_no?: string | null
          tax_office?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "quote_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_signature_profile_id_fkey"
            columns: ["signature_profile_id"]
            isOneToOne: false
            referencedRelation: "signature_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          created_at: string | null
          id: string
          name: string
          unit: string
          unit_price: number
          user_id: string
          vat_rate: number
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          id?: string
          name: string
          unit?: string
          unit_price?: number
          user_id: string
          vat_rate?: number
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          id?: string
          name?: string
          unit?: string
          unit_price?: number
          user_id?: string
          vat_rate?: number
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string | null
          id: string
          line_subtotal: number
          line_total: number
          line_vat: number
          product_brand: string | null
          product_id: string | null
          product_name: string
          product_unit: string
          quantity: number
          quote_id: string
          sort_order: number | null
          unit_price_effective: number
          vat_rate: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_subtotal: number
          line_total: number
          line_vat: number
          product_brand?: string | null
          product_id?: string | null
          product_name: string
          product_unit?: string
          quantity?: number
          quote_id: string
          sort_order?: number | null
          unit_price_effective: number
          vat_rate?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          line_subtotal?: number
          line_total?: number
          line_vat?: number
          product_brand?: string | null
          product_id?: string | null
          product_name?: string
          product_unit?: string
          quantity?: number
          quote_id?: string
          sort_order?: number | null
          unit_price_effective?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_templates: {
        Row: {
          base_template_key: string
          config_json: Json | null
          created_at: string | null
          id: string
          name: string
          preview_image_url: string | null
          preview_pdf_url: string | null
          user_id: string
        }
        Insert: {
          base_template_key?: string
          config_json?: Json | null
          created_at?: string | null
          id?: string
          name: string
          preview_image_url?: string | null
          preview_pdf_url?: string | null
          user_id: string
        }
        Update: {
          base_template_key?: string
          config_json?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          preview_image_url?: string | null
          preview_pdf_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          company_id: string
          created_at: string | null
          currency: string
          customer_company: string | null
          customer_name: string | null
          grand_total: number
          id: string
          pdf_url: string | null
          quote_no: string | null
          subtotal: number
          template_id: string | null
          user_id: string
          vat_total: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          currency?: string
          customer_company?: string | null
          customer_name?: string | null
          grand_total?: number
          id?: string
          pdf_url?: string | null
          quote_no?: string | null
          subtotal?: number
          template_id?: string | null
          user_id: string
          vat_total?: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          currency?: string
          customer_company?: string | null
          customer_name?: string | null
          grand_total?: number
          id?: string
          pdf_url?: string | null
          quote_no?: string | null
          subtotal?: number
          template_id?: string | null
          user_id?: string
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quote_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_profiles: {
        Row: {
          created_at: string | null
          id: string
          signature_image_url: string | null
          signer_name: string
          signer_title: string
          stamp_image_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          signature_image_url?: string | null
          signer_name: string
          signer_title: string
          stamp_image_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          signature_image_url?: string | null
          signer_name?: string
          signer_title?: string
          stamp_image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

