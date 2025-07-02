import { Global, Module } from '@nestjs/common';

import { UserReplicas } from './user.replicas';
import { UserService } from './user.service';

@Global()
@Module({
	providers: [UserService, UserReplicas],
	exports: [UserService, UserReplicas],
})
export class UserModule {}
