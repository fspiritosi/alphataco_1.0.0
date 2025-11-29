// import useSWR from "swr"

// export interface Role {
//   id: string
//   name: string
//   slug: string
//   description: string | null
//   color: string | null
//   is_system: boolean
// }

// interface UseRolesOptions {
//   supabaseClient: any
// }

// const fetchRoles = async (supabase: any): Promise<Role[]> => {
//   const { data, error } = await supabase
//     .from("roles")
//     .select("id, name, slug, description, color, is_system")
//     .eq("is_active", true)
//     .order("name")

//   if (error) {
//     console.error("Error fetching roles:", error)
//     throw error
//   }

//   return data ?? []
// }

// export function useRoles({ supabaseClient }: UseRolesOptions) {
//   const { data, error, isLoading, mutate } = useSWR<Role[]>(
//     supabaseClient ? "roles" : null,
//     () => fetchRoles(supabaseClient),
//     {
//       revalidateOnFocus: false,
//     },
//   )

//   return {
//     roles: data ?? [],
//     isLoading,
//     isError: !!error,
//     error,
//     refetch: mutate,
//   }
// }
