import { getUsersbyId } from '@/app/server/GET/actions';
import { UserPermissionsManager } from '@/features/UserPermissionsManager/UserPermissionsManager';

async function User({ params }: { params: { id: string } }) {
  const data: any = await getUsersbyId({ id: params.id });

  // El ID del usuario en auth.users es el credential_id del profile
  const authUserId = data[0]?.profile_id?.credential_id || params.id;

  return (
    <section className=" md:mx-7 py-4">
      <UserPermissionsManager
        userId={authUserId}
        userName={data[0]?.profile_id?.fullname || ''}
        userEmail={data[0]?.profile_id?.email || ''}
      />
    </section>
  );
}

export default User;
